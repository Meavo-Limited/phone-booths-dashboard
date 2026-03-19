import csv
import io
from typing import List

from fastapi import APIRouter, UploadFile, File, HTTPException, status
from sqlmodel import select

from app.api.deps import SessionDep, CurrentUser
from app.models.clients import Client
from app.models.org_units import OrgUnit
from app.models.phone_booths import PhoneBooth
from app.models.sensors import Sensor
from pydantic import BaseModel

router = APIRouter(prefix="/csv-imports", tags=["imports"])


class ImportErrorRow(BaseModel):
    row: int
    reason: str

class ImportResult(BaseModel):
    total_rows: int
    created: int
    skipped: int
    errors: List[ImportErrorRow]


@router.post(
    "/phone-booths-sensors",
    response_model=ImportResult,
    status_code=status.HTTP_201_CREATED,
)
def import_phone_booths_csv(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    file: UploadFile = File(...),
):
    # ---- Access control ----
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Superuser access required")

    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="CSV file required")

    content = file.file.read().decode("utf-8")
    reader = csv.DictReader(io.StringIO(content))

    required_columns = {
        "client_name",
        "booth_name",
        "booth_serial_num",
        "org_unit_name",
        "sensor_serial_num",
        "timezone",
    }

    if not required_columns.issubset(reader.fieldnames or []):
        raise HTTPException(
            status_code=400,
            detail=f"CSV must contain columns: {', '.join(required_columns)}",
        )

    rows = list(reader)
    if not rows:
        raise HTTPException(status_code=400, detail="CSV is empty")

    # ---- Resolve client (fail fast) ----
    client_name = rows[0]["client_name"].strip()
    client = session.exec(
        select(Client).where(Client.name == client_name)
    ).first()

    if not client:
        raise HTTPException(
            status_code=400,
            detail=f"Client '{client_name}' does not exist",
        )

    created = 0
    errors: List[ImportErrorRow] = []

    for index, row in enumerate(rows, start=2):  # header = row 1
        try:
            booth_serial = row["booth_serial_num"].strip()
            sensor_serial = row["sensor_serial_num"].strip()
            booth_name = row["booth_name"].strip()
            org_unit_name = row["org_unit_name"].strip()
            timezone_str = row["timezone"].strip()

            if not all([booth_serial, sensor_serial, booth_name, org_unit_name, timezone_str]):
                raise ValueError("Missing required fields")

            from zoneinfo import ZoneInfo
            try:
                ZoneInfo(timezone_str)
            except Exception:
                raise ValueError(f"Invalid timezone: {timezone_str}")

            # ---- Org unit lookup ----
            org_unit = session.exec(
                select(OrgUnit).where(
                    OrgUnit.client_id == client.id,
                    OrgUnit.name == org_unit_name,
                )
            ).first()

            if not org_unit:
                raise ValueError("Org unit not found")

            # ---- Uniqueness checks ----
            if session.exec(
                select(PhoneBooth).where(
                    PhoneBooth.serial_number == booth_serial
                )
            ).first():
                raise ValueError("Booth serial already exists")

            if session.exec(
                select(Sensor).where(
                    Sensor.serial_number == sensor_serial
                )
            ).first():
                raise ValueError("Sensor serial already exists")

            # ---- Create booth ----
            booth = PhoneBooth(
                name=booth_name,
                serial_number=booth_serial,
                client_id=client.id,
                org_unit_id=org_unit.id,
                timezone=timezone_str,
            )
            session.add(booth)
            session.flush()  # get booth.id

            # ---- Create sensor ----
            sensor = Sensor(
                serial_number=sensor_serial,
                phone_booth_id=booth.id,
            )
            session.add(sensor)

            created += 1

        except Exception as e:
            errors.append(
                ImportErrorRow(row=index, reason=str(e))
            )
            session.rollback()
            continue

    session.commit()

    return ImportResult(
        total_rows=len(rows),
        created=created,
        skipped=len(errors),
        errors=errors,
    )
