import uuid
from typing import Any, List
from datetime import datetime, date, time, timedelta, timezone

from fastapi import APIRouter, HTTPException, status, Query
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.models.usage_sessions import HourlyUtilizationResponse, UsageSession, UsageSessionCreate, UsageSessionRead
from app.models.general_models import Message
from app.models.phone_booths import PhoneBooth
from pydantic import BaseModel
import logging
from pprint import pprint


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/usage-sessions", tags=["usage_sessions"]) 

@router.get("/", response_model=List[UsageSessionRead])
def read_usage_sessions(session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 100) -> Any:
    if current_user.is_superuser:
        statement = select(UsageSession)
    else:
        if not current_user.client_id:
            return []
        statement = select(UsageSession).where(UsageSession.client_id == current_user.client_id)
    statement = statement.offset(skip).limit(limit)
    sessions = session.exec(statement).all()
    return sessions

@router.get("/hourly-utilization")
def hourly_utilization(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    booth_ids: str = Query(..., description="Comma-separated list of booth UUIDs"),
    start_date: date = Query(..., description="Inclusive start date YYYY-MM-DD"),
    end_date: date = Query(..., description="Inclusive end date YYYY-MM-DD"),
) -> HourlyUtilizationResponse:
    """
    Returns hourly utilization % for the selected booths across the given period.

    Rules:
    - DB stores timestamptz (UTC internally)
    - Bucket math is done in the booth's LOCAL timezone
    - DB querying is done in UTC
    """

    # ------------------------------------------------------------------
    # Parse booth IDs
    # ------------------------------------------------------------------
    try:
        booth_uuid_list = [uuid.UUID(x.strip()) for x in booth_ids.split(",") if x.strip()]
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid booth_ids format")

    if not booth_uuid_list:
        raise HTTPException(status_code=400, detail="At least one booth_id is required")

    # ------------------------------------------------------------------
    # Load booths & permissions
    # ------------------------------------------------------------------
    stmt = select(PhoneBooth).where(PhoneBooth.id.in_(booth_uuid_list))
    booths = session.exec(stmt).all()

    if len(booths) != len(booth_uuid_list):
        raise HTTPException(status_code=404, detail="One or more phone booths not found")

    if not current_user.is_superuser:
        for b in booths:
            if b.client_id != current_user.client_id:
                raise HTTPException(status_code=403, detail="Not enough permissions")

    # ------------------------------------------------------------------
    # Enforce identical workday window (MVP)
    # ------------------------------------------------------------------
    workday_starts = {b.workday_start for b in booths}
    workday_ends = {b.workday_end for b in booths}

    if len(workday_starts) != 1 or len(workday_ends) != 1:
        raise HTTPException(
            status_code=400,
            detail="All booths must share the same workday_start/workday_end"
        )

    workday_start: time = workday_starts.pop()
    workday_end: time = workday_ends.pop()

    if workday_start.tzinfo is None or workday_end.tzinfo is None:
        raise HTTPException(
            status_code=500,
            detail="workday_start/workday_end must be timezone-aware"
        )

    tz = workday_start.tzinfo

    start_hour = workday_start.hour
    end_hour = workday_end.hour

    if end_hour <= start_hour:
        raise HTTPException(status_code=400, detail="Invalid workday window")

    hour_labels = [
        f"{time(h,0).strftime('%H:%M')} - {time(h+1,0).strftime('%H:%M')}"
        for h in range(start_hour, end_hour)
    ]

    # ------------------------------------------------------------------
    # Period bounds (LOCAL → UTC)
    # ------------------------------------------------------------------
    if end_date < start_date:
        raise HTTPException(status_code=400, detail="end_date must be >= start_date")

    days = (end_date - start_date).days + 1

    period_start_local = datetime.combine(start_date, time.min, tzinfo=tz)
    period_end_local = datetime.combine(end_date + timedelta(days=1), time.min, tzinfo=tz)

    period_start_utc = period_start_local.astimezone(timezone.utc)
    period_end_utc = period_end_local.astimezone(timezone.utc)

    # ------------------------------------------------------------------
    # Load sessions intersecting the period (UTC query)
    # ------------------------------------------------------------------
    stmt = (
        select(UsageSession)
        .where(UsageSession.phone_booth_id.in_(booth_uuid_list))
        .where(UsageSession.start_time < period_end_utc)
        .where(
            (UsageSession.end_time == None)
            | (UsageSession.end_time > period_start_utc)
        )
    )

    sessions = session.exec(stmt).all()

    # ------------------------------------------------------------------
    # Bucket aggregation (LOCAL TIME)
    # ------------------------------------------------------------------
    used_seconds_by_hour = {label: 0.0 for label in hour_labels}

    def add_session_to_buckets(sess_start_utc: datetime, sess_end_utc: datetime):
        # Convert session times to local timezone
        start = sess_start_utc.astimezone(tz)
        end = sess_end_utc.astimezone(tz)

        # Clip to period
        start = max(start, period_start_local)
        end = min(end, period_end_local)

        if end <= start:
            return

        cur_day = start.date()
        last_day = (end - timedelta(seconds=1)).date()

        while cur_day <= last_day:
            for h in range(start_hour, end_hour):
                hour_start = datetime.combine(cur_day, time(h, 0), tzinfo=tz)
                hour_end = hour_start + timedelta(hours=1)

                overlap_start = max(start, hour_start)
                overlap_end = min(end, hour_end)

                overlap = (overlap_end - overlap_start).total_seconds()
                if overlap > 0:
                    label = f"{time(h,0).strftime('%H:%M')} - {time(h+1,0).strftime('%H:%M')}"
                    used_seconds_by_hour[label] += overlap

            cur_day += timedelta(days=1)

    for s in sessions:
        s_end = s.end_time if s.end_time is not None else period_end_utc
        add_session_to_buckets(s.start_time, s_end)

    # ------------------------------------------------------------------
    # Compute utilization
    # ------------------------------------------------------------------
    num_booths = len(booth_uuid_list)
    available_seconds = num_booths * 3600 * days

    hours_out = []
    for label in hour_labels:
        used = used_seconds_by_hour[label]
        utilization = min(max(used / available_seconds, 0.0), 1.0)
        hours_out.append(
            {"time": label, "utilization": round(utilization, 4)}
        )

    return HourlyUtilizationResponse(
        workday_start=workday_start.strftime("%H:%M"),
        workday_end=workday_end.strftime("%H:%M"),
        hours=hours_out,
    )



class UsageReportDay(BaseModel):
    day: str
    total_hours: float
    booths: dict[str, float]  # booth_id -> hours


@router.get("/charts", response_model=List[UsageReportDay])
def usage_reports_charts(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    booth_ids: str | None = Query(
        None,
        description="Comma-separated booth UUIDs. If empty: fetch all booths for current user."
    ),
    start_date: date = Query(..., description="Inclusive start date YYYY-MM-DD"),
    end_date: date = Query(..., description="Inclusive end date YYYY-MM-DD"),
):
    """
    Returns precomputed usage per day per booth and total daily hours.
    If booth_ids is empty, automatically loads all booths accessible to the user.
    """

    # ---------------------------------------------------------------------
    # 1. AUTO-LOAD BOOTHS WHEN booth_ids IS EMPTY
    # ---------------------------------------------------------------------
    raw_ids = (booth_ids or "").strip()

    if raw_ids == "":
        # Auto-select all booths for this user
        if current_user.is_superuser:
            stmt = select(PhoneBooth)
        else:
            if not current_user.client_id:
                return []
            stmt = select(PhoneBooth).where(PhoneBooth.client_id == current_user.client_id)

        all_booths = session.exec(stmt).all()
        booth_uuid_list = [b.id for b in all_booths]

        if not booth_uuid_list:
            return []  # no booths → no data

    else:
        # Parse provided booth_ids
        try:
            booth_uuid_list = [
                uuid.UUID(x.strip()) for x in raw_ids.split(",") if x.strip()
            ]
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid booth_ids format")

        if not booth_uuid_list:
            raise HTTPException(status_code=400, detail="At least one booth_id is required")

        # Permission-scoped validation
        stmt = select(PhoneBooth).where(PhoneBooth.id.in_(booth_uuid_list))
        if not current_user.is_superuser:
            stmt = stmt.where(PhoneBooth.client_id == current_user.client_id)

        booths = session.exec(stmt).all()

        if len(booths) != len(booth_uuid_list):
            raise HTTPException(
                status_code=404,
                detail="One or more booths not found or forbidden"
            )

    # ---------------------------------------------------------------------
    # Rest of the existing logic continues unchanged
    # ---------------------------------------------------------------------

    if end_date < start_date:
        raise HTTPException(status_code=400, detail="end_date must be >= start_date")

    # Build day list
    day_list = []
    cur = start_date
    while cur <= end_date:
        day_list.append(cur)
        cur += timedelta(days=1)

    # Load sessions
    stmt = (
        select(UsageSession)
        .where(UsageSession.phone_booth_id.in_(booth_uuid_list))
        .where(UsageSession.start_time >= datetime.combine(start_date, time.min))
        .where(UsageSession.start_time <= datetime.combine(end_date, time.max))
    )
    sessions = session.exec(stmt).all()

    # Initialize aggregation store
    usage_by_day: dict[str, dict[str, float]] = {
        d.isoformat(): {} for d in day_list
    }

    # Process sessions
    for s in sessions:
        booth_id = str(s.phone_booth_id)
        hours = (s.duration_seconds or 0) / 3600
        day_key = s.start_time.date().isoformat()

        if day_key in usage_by_day:
            usage_by_day[day_key][booth_id] = usage_by_day[day_key].get(booth_id, 0) + hours

    # Build response
    output: List[UsageReportDay] = []

    for d in day_list:
        day_str = d.isoformat()
        booths_dict = usage_by_day[day_str]
        
        rounded_booths_dict = {k: round(v, 2) for k, v in booths_dict.items()}
        
        total_hours = round(sum(booths_dict.values()), 2)

        output.append(
            UsageReportDay(
                day=day_str,
                total_hours=total_hours,
                booths=rounded_booths_dict
            )
        )

    return output

@router.get("/{id}", response_model=UsageSessionRead)
def read_usage_session(session: SessionDep, current_user: CurrentUser, id: uuid.UUID) -> Any:
    s = session.get(UsageSession, id)
    if not s:
        raise HTTPException(status_code=404, detail="Usage session not found")
    if not current_user.is_superuser and s.client_id != current_user.client_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return s


@router.post("/", response_model=UsageSessionRead, status_code=status.HTTP_201_CREATED)
def create_usage_session(*, session: SessionDep, current_user: CurrentUser, s_in: UsageSessionCreate) -> Any:
    if not current_user.is_superuser and s_in.client_id != current_user.client_id:
        raise HTTPException(status_code=403, detail="Not enough privileges")
    s = UsageSession.model_validate(s_in)
    session.add(s)
    session.commit()
    session.refresh(s)
    return s


@router.delete("/{id}", response_model=Message)
def delete_usage_session(session: SessionDep, current_user: CurrentUser, id: uuid.UUID) -> Any:
    s = session.get(UsageSession, id)
    if not s:
        raise HTTPException(status_code=404, detail="Usage session not found")
    if not current_user.is_superuser and s.client_id != current_user.client_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    session.delete(s)
    session.commit()
    return Message(message="Usage session deleted successfully")
