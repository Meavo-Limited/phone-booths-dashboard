from datetime import date, time
import uuid
from typing import Any, List, Optional

from app.utils import calculate_working_days_and_hours
from fastapi import APIRouter, HTTPException, status
from sqlmodel import select, func

from app.api.deps import CurrentUser, SessionDep
from app.models.phone_booths import PhoneBooth, PhoneBoothCreate, PhoneBoothRead, PhoneBoothsRead, WorkdayResponse, PhoneBoothsBulkWorkdayUpdate
from app.models.general_models import Message
import logging


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/phone-booths", tags=["phone_booths"])


@router.get("/", response_model=PhoneBoothsRead)
def read_phone_booths_paginated(
    session: SessionDep,
    current_user: CurrentUser,
    client_id: Optional[uuid.UUID] = None,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """List phone booths. Superusers see all; others limited to their client."""
    logger.info(f"User {current_user} is requesting phone booths list")
    if current_user.is_superuser:
        count_statement = select(func.count()).select_from(PhoneBooth)
        count = session.exec(count_statement).one()
        statement = select(PhoneBooth)
    else:
        if not current_user.client_id:
            logger.warning(f"User {current_user} has no client_id; returning empty data.")
            return PhoneBoothsRead(data=[], count=0)
        count_statement = (
            select(func.count())
            .select_from(PhoneBooth)
            .where(PhoneBooth.client_id == current_user.client_id)
        )
        count = session.exec(count_statement).one()
        statement = select(PhoneBooth).where(PhoneBooth.client_id == current_user.client_id)
    
    statement = statement.offset(skip).limit(limit)
    booths = session.exec(statement).all()
    
    return PhoneBoothsRead(data=booths, count=count)

@router.get("/all", response_model=List[PhoneBoothRead])
def read_phone_booths(
    session: SessionDep,
    current_user: CurrentUser,
    client_id: Optional[uuid.UUID] = None,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """List phone booths. Superusers see all; others limited to their client."""
    logger.info(f"User {current_user} is requesting phone booths list")
    if current_user.is_superuser:
        statement = select(PhoneBooth)
        if client_id:
            statement = statement.where(PhoneBooth.client_id == client_id)
    else:
        if not current_user.client_id:
            return []
        statement = select(PhoneBooth).where(PhoneBooth.client_id == current_user.client_id)
    
    statement = statement.offset(skip).limit(limit)
    booths = session.exec(statement).all()
    
    return booths

@router.get("/busy", response_model=List[PhoneBoothRead])
def read_busy_phone_booths(
    session: SessionDep,
    current_user: CurrentUser,
    client_id: Optional[uuid.UUID] = None,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Get only busy phone booths (state_id = 1).
    Superusers see all busy booths; others limited to their client's busy booths.
    """
    if current_user.is_superuser:
        statement = select(PhoneBooth).where(PhoneBooth.state_id == 1)
        if client_id:
            statement = statement.where(PhoneBooth.client_id == client_id)
    else:
        if not current_user.client_id:
            return []
        statement = select(PhoneBooth).where(
            PhoneBooth.client_id == current_user.client_id,
            PhoneBooth.state_id == 1
        )
    
    statement = statement.offset(skip).limit(limit)
    booths = session.exec(statement).all()
    
    return booths

@router.get("/calculate-working-time", response_model=WorkdayResponse)
def calculate_working_time(start_date: date, end_date: date, workday_start: time, workday_end: time, workdays_mask: int) -> Any:
    
    logger.info(f"Calculating working time from {start_date} to {end_date} with workday {workday_start}-{workday_end} and mask {workdays_mask}")
    working_days, total_hours = calculate_working_days_and_hours(
        start=start_date,
        end=end_date,
        day_start=workday_start,
        day_end=workday_end,
        mask=workdays_mask,
    )
    
    return WorkdayResponse(
        working_days=working_days,
        total_hours=total_hours,
    )

@router.get("/{id}", response_model=PhoneBoothRead)
def read_phone_booth(session: SessionDep, current_user: CurrentUser, id: uuid.UUID) -> Any:
    booth = session.get(PhoneBooth, id)
    if not booth:
        raise HTTPException(status_code=404, detail="Phone booth not found")
    if not current_user.is_superuser and booth.client_id != current_user.client_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return booth


@router.post("/", response_model=PhoneBoothRead, status_code=status.HTTP_201_CREATED)
def create_phone_booth(*, session: SessionDep, current_user: CurrentUser, booth_in: PhoneBoothCreate) -> Any:
    # allow superusers or users creating booths for their own client
    if not current_user.is_superuser and booth_in.client_id and booth_in.client_id != current_user.client_id:
        raise HTTPException(status_code=403, detail="Not enough privileges")
    booth = PhoneBooth.model_validate(booth_in)
    session.add(booth)
    session.commit()
    session.refresh(booth)
    return booth


@router.put("/{id}", response_model=PhoneBoothRead)
def update_phone_booth(*, session: SessionDep, current_user: CurrentUser, id: uuid.UUID, booth_in: PhoneBoothCreate) -> Any:
    booth = session.get(PhoneBooth, id)
    if not booth:
        raise HTTPException(status_code=404, detail="Phone booth not found")
    if not current_user.is_superuser and booth.client_id != current_user.client_id:
        raise HTTPException(status_code=403, detail="Not enough privileges")
    update_data = booth_in.model_dump(exclude_unset=True)
    booth.sqlmodel_update(update_data)
    session.add(booth)
    session.commit()
    session.refresh(booth)
    return booth


@router.patch("/workday/bulk-update", response_model=dict)
def bulk_update_workday_settings(
    *, session: SessionDep, current_user: CurrentUser, update_in: PhoneBoothsBulkWorkdayUpdate
) -> Any:
    """
    Bulk update workday settings (start time, end time, and working days mask) for all phone booths.
    Superusers can update all booths; regular users can only update booths in their client.
    """
    if current_user.is_superuser:
        statement = select(PhoneBooth)
    else:
        if not current_user.client_id:
            raise HTTPException(status_code=403, detail="User has no client")
        statement = select(PhoneBooth).where(PhoneBooth.client_id == current_user.client_id)
    
    booths = session.exec(statement).all()
    
    if not booths:
        raise HTTPException(status_code=404, detail="No phone booths found")
    
    # Update all booths with new workday settings
    for booth in booths:
        booth.workday_start = update_in.workday_start
        booth.workday_end = update_in.workday_end
        booth.working_days_mask = update_in.working_days_mask
        session.add(booth)
    
    session.commit()
    
    return {
        "message": f"Successfully updated {len(booths)} phone booth(s)",
        "updated_count": len(booths)
    }


@router.delete("/{id}", response_model=Message)
def delete_phone_booth(session: SessionDep, current_user: CurrentUser, id: uuid.UUID) -> Any:
    booth = session.get(PhoneBooth, id)
    if not booth:
        raise HTTPException(status_code=404, detail="Phone booth not found")
    if not current_user.is_superuser and booth.client_id != current_user.client_id:
        raise HTTPException(status_code=403, detail="Not enough privileges")
    session.delete(booth)
    session.commit()
    return Message(message="Phone booth deleted successfully")


