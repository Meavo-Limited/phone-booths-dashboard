import json
import logging
import random
import ssl
from datetime import datetime
from typing import Any

from paho.mqtt import client as mqtt_client
from sqlmodel import Session, select

from app.core.config import settings
from app.core.db import engine
from app.crud import create_sensor_event, create_usage_session
from app.models.phone_booths import PhoneBooth
from app.models.sensors import Sensor
from app.models.sensor_events import SensorEvent, SensorEventCreate
from app.models.usage_sessions import UsageSessionCreate

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def on_connect(client: mqtt_client.Client, userdata: Any, flags: dict, rc: int) -> None:
    """Handle MQTT connection."""
    if rc == 0:
        logger.info("Connected to MQTT Broker!")
        # Subscribe to all sensor booth status events
        client.subscribe("sensors/+/events/boothstatus/")
    else:
        logger.error(f"Failed to connect to MQTT Broker, return code {rc}")


def parse_timestamp(timestamp_str: str) -> datetime:
    """
    Parse timestamp string with timezone info.
    Expected format: "2025-11-07 09:23:19.486 +0100"
    """
    try:
        # Try parsing with timezone
        return datetime.fromisoformat(timestamp_str.replace(" +", "+"))
    except ValueError:
        # Fallback: try without timezone
        try:
            return datetime.fromisoformat(timestamp_str)
        except ValueError:
            logger.warning(f"Failed to parse timestamp: {timestamp_str}. Using current time.")
            return datetime.utcnow()


def on_message_booth_status(
    client: mqtt_client.Client, userdata: Any, msg: mqtt_client.MQTTMessage
) -> None:
    """
    Handle booth status MQTT messages.
    Topic: sensors/{sensor_serial_number}/events/boothstatus/
    Payload: {"sensor_serial": "...", "boothstatus": "1" or "0", "timestamp": "..."}
    """
    try:
        payload = json.loads(msg.payload.decode())
        sensor_serial = payload.get("sensor_serial")
        booth_status = int(payload.get("boothstatus", -1))
        timestamp_str = payload.get("timestamp")

        if not sensor_serial or booth_status not in [0, 1] or not timestamp_str:
            logger.error(f"Invalid MQTT message: {payload}")
            return

        logger.info(f"Parsing MQTT message: {payload}")
        event_time = parse_timestamp(timestamp_str)

        with Session(engine) as session:
            # Fetch sensor by serial number
            statement = select(Sensor).where(Sensor.serial_number == sensor_serial)
            sensor = session.exec(statement).first()

            if not sensor:
                logger.warning(f"Sensor with serial {sensor_serial} not found")
                return

            # Fetch phone booth to get client and org_unit
            booth = session.get(PhoneBooth, sensor.phone_booth_id)
            if not booth:
                logger.error(f"Phone booth {sensor.phone_booth_id} not found")
                return

            # Update booth state and last_seen time
            booth.state_id = booth_status
            booth.last_seen = datetime.utcnow()
            booth.updated_at = datetime.utcnow()
            session.add(booth)
            session.commit()

            # Create sensor event
            sensor_event_in = SensorEventCreate(
                sensor_id=sensor.id,
                phone_booth_id=booth.id,
                client_id=booth.client_id,
                org_unit_id=booth.org_unit_id,
                state_id=booth_status,
                event_time_utc=event_time,
            )
            sensor_event = create_sensor_event(
                session=session,
                sensor_event_in=sensor_event_in,
                raw_payload=payload,
            )
            
            # Update sensor's last event ID
            sensor.updated_at = datetime.utcnow()
            session.add(sensor)
            session.commit()
            
            logger.info(
                f"Created sensor event for booth {booth.name} (state={booth_status}) Event ID: {sensor_event.id}"
            )

            # If booth is now free (0), create usage session
            if booth_status == 0:
                # TODO: Get the last sensor event from the sensor.last_event_id
                # Find the most recent busy event (state=1) for this booth
                busy_event_stmt = (
                    select(SensorEvent)
                    .where(
                        SensorEvent.phone_booth_id == booth.id,
                        SensorEvent.state_id == 1,
                    )
                    .order_by(SensorEvent.event_time_utc.desc())
                )
                busy_event = session.exec(busy_event_stmt).first()

                if busy_event:
                    # Calculate duration in seconds
                    duration_seconds = int(
                        (event_time - busy_event.event_time_utc).total_seconds()
                    )

                    # Create usage session
                    usage_session_in = UsageSessionCreate(
                        phone_booth_id=booth.id,
                        client_id=booth.client_id,
                        org_unit_id=booth.org_unit_id,
                        start_time=busy_event.event_time_utc,
                        end_time=event_time,
                        duration_seconds=duration_seconds,
                    )
                    usage_session = create_usage_session(
                        session=session, usage_session_in=usage_session_in
                    )
                    logger.info(
                        f"Created usage session for booth {booth.name}: "
                        f"{duration_seconds}s ({busy_event.event_time_utc} to {event_time})"
                    )
                else:
                    logger.warning(
                        f"Received free event for booth {booth.name} "
                        f"but no preceding busy event found"
                    )

    except json.JSONDecodeError:
        logger.error(f"Failed to parse JSON from MQTT message: {msg.payload}")
    except Exception as e:
        logger.error(f"Error processing MQTT booth status message: {e}", exc_info=True)


def get_mqtt_client() -> mqtt_client.Client:
    """Create and configure MQTT client."""
    # Generate client ID with pub prefix randomly
    client_id = f"fastapi-mqtt-{random.randint(0, 1000000)}"

    client = mqtt_client.Client(mqtt_client.CallbackAPIVersion.VERSION1, client_id)

    # Set up TLS if certificates are configured
    if hasattr(settings, "MQTT_CA_CERTS"):
        client.tls_set(
            ca_certs=settings.MQTT_CA_CERTS,
            cert_reqs=ssl.CERT_REQUIRED,
            tls_version=ssl.PROTOCOL_TLS,
        )

    # Set username and password if configured
    if hasattr(settings, "MQTT_USERNAME") and hasattr(settings, "MQTT_PASSWORD"):
        client.username_pw_set(settings.MQTT_USERNAME, settings.MQTT_PASSWORD)

    # Set callbacks
    client.on_connect = on_connect
    client.on_message = on_message_booth_status

    return client