from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class SensorBase(SQLModel):
    type: Optional[str] = None
    mqtt_topic: Optional[str] = None
    status: str = "active"
    serial_number: str

class Sensor(SensorBase, table=True):
    __tablename__: str = "sensors"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    phone_booth_id: uuid.UUID = Field(foreign_key="phone_booths.id")
    type: Optional[str] = None
    mqtt_topic: Optional[str] = None
    status: str = Field(default="active")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    serial_number: str = Field(unique=True, max_length=100)


class SensorCreate(SensorBase):
    phone_booth_id: uuid.UUID


class SensorRead(SensorBase):
    id: uuid.UUID
    phone_booth_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
