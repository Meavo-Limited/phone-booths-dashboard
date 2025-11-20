from __future__ import annotations

import uuid
from datetime import datetime, time, date
from typing import Optional

from pydantic import BaseModel
from sqlmodel import Field, SQLModel


class PhoneBoothBase(SQLModel):
    name: str
    serial_number: str
    timezone: Optional[str] = None
    last_seen: Optional[datetime] = None
    state_id: Optional[int] = 0
    working_hours: int
    workday_start: time
    workday_end: time


class PhoneBooth(PhoneBoothBase, table=True):
    __tablename__: str = "phone_booths"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    client_id: Optional[uuid.UUID] = Field(default=None, foreign_key="clients.id")
    org_unit_id: Optional[uuid.UUID] = Field(default=None, foreign_key="org_units.id") # TODO This field is not needed, remove later
    name: str
    serial_number: str
    state_id: Optional[int] = Field(default=0, foreign_key="booth_states.id")
    last_seen: Optional[datetime] = None
    timezone: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    working_hours: int = Field(default=8)
    workday_start: time = Field(default=time(9, 0))
    workday_end: time = Field(default=time(17, 0))
    working_days_mask: int = Field(default=31)


class PhoneBoothCreate(PhoneBoothBase):
    client_id: Optional[uuid.UUID] = None
    org_unit_id: Optional[uuid.UUID] = None


class PhoneBoothRead(PhoneBoothBase):
    id: uuid.UUID
    client_id: Optional[uuid.UUID]
    org_unit_id: Optional[uuid.UUID]
    created_at: datetime
    updated_at: datetime

class PhoneBoothsRead(SQLModel):
    data: list[PhoneBoothRead]
    count: int

class WorkdayResponse(BaseModel):
    working_days: int
    total_hours: int