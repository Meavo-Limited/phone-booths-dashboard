import uuid
from typing import Any, List
from datetime import datetime, date, time, timedelta

from fastapi import APIRouter, HTTPException, status, Query
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.models.usage_sessions import HourlyUtilizationResponse, UsageSession, UsageSessionCreate, UsageSessionRead
from app.models.general_models import Message
from app.models.phone_booths import PhoneBooth

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

    Assumptions / behavior:
    - booth_ids: comma-separated UUIDs (e.g. "id1,id2,...").
    - start_date / end_date are inclusive and are dates (no times).
    - All booths must share the same workday_start and workday_end (otherwise 400).
    - Timezones are ignored for MVP (timestamps are used as stored).
    - For each hour label (e.g. "08:00"), we sum usage seconds across ALL days in the period
      and normalize by (#booths * 3600 * number_of_days).
    """

    # ---- parse booth ids ----
    try:
        booth_uuid_list = [uuid.UUID(x.strip()) for x in booth_ids.split(",") if x.strip()]
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid booth_ids format; must be comma-separated UUIDs")

    if not booth_uuid_list:
        raise HTTPException(status_code=400, detail="At least one booth_id is required")

    # permission: ensure user can access these booths (superuser or client match)
    stmt = select(PhoneBooth).where(PhoneBooth.id.in_(booth_uuid_list))
    booths = session.exec(stmt).all()

    if len(booths) != len(booth_uuid_list):
        raise HTTPException(status_code=404, detail="One or more phone booths not found")

    if not current_user.is_superuser:
        for b in booths:
            if b.client_id != current_user.client_id:
                raise HTTPException(status_code=403, detail="Not enough permissions for one or more booths")

    # ---- ensure same workday start/end across booths (MVP) ----
    workday_starts = {b.workday_start for b in booths}
    workday_ends = {b.workday_end for b in booths}
    if len(workday_starts) != 1 or len(workday_ends) != 1:
        raise HTTPException(
            status_code=400,
            detail="All selected booths must have identical workday_start and workday_end for this endpoint (MVP)."
        )
    workday_start: time = workday_starts.pop()
    workday_end: time = workday_ends.pop()

    # Build list of hour labels from workday_start.hour .. workday_end.hour inclusive
    start_hour = workday_start.hour
    end_hour = workday_end.hour
    if end_hour < start_hour:
        raise HTTPException(status_code=400, detail="workday_end must be after workday_start")

    hour_labels = [time(h, 0).strftime("%H:%M") for h in range(start_hour, end_hour + 1)]

    # ---- date range bounds ----
    if end_date < start_date:
        raise HTTPException(status_code=400, detail="end_date must be >= start_date")

    days = (end_date - start_date).days + 1

    period_start_dt = datetime.combine(start_date, time.min)  # 00:00:00 on start_date
    period_end_dt_exclusive = datetime.combine(end_date + timedelta(days=1), time.min)  # exclusive upper bound

    # ---- load sessions for these booths that intersect the period ----
    # Condition: session.start_time < period_end AND (session.end_time IS NULL OR session.end_time > period_start)
    stmt = (
        select(UsageSession)
        .where(UsageSession.phone_booth_id.in_(booth_uuid_list))
        .where(UsageSession.start_time < period_end_dt_exclusive)
    )
    all_sessions = session.exec(stmt).all()

    # Filter further in Python to handle end_time being None and intersection logic
    relevant_sessions: List[UsageSession] = []
    for s in all_sessions:
        s_end = s.end_time if s.end_time is not None else period_end_dt_exclusive
        if s_end > period_start_dt and s.start_time < period_end_dt_exclusive:
            relevant_sessions.append(s)

    # ---- prepare bucket counters: dictionary hour_label -> total used seconds across all days and booths ----
    used_seconds_by_hour = {label: 0 for label in hour_labels}

    # Helper: iterate each session and add overlaps into hourly buckets
    def add_session_to_buckets(sess_start: datetime, sess_end: datetime):
        # clip session to period
        start = max(sess_start, period_start_dt)
        end = min(sess_end, period_end_dt_exclusive)
        if end <= start:
            return

        # iterate day by day from start.date() to end.date()
        cur_day = start.date()
        last_day = (end - timedelta(seconds=1)).date()  # inclusive last day
        while cur_day <= last_day:
            # day bounds in datetime
            day_work_start = datetime.combine(cur_day, workday_start)
            day_work_end = datetime.combine(cur_day, workday_end) + timedelta(hours=0)  # end is hour start label inclusive

            # For each hour in the workday, compute overlapping seconds
            for h in range(start_hour, end_hour + 1):
                hour_start = datetime.combine(cur_day, time(h, 0))
                hour_end = hour_start + timedelta(hours=1)

                # Only consider hour within the workday: we already used start_hour..end_hour range
                # Compute overlap between [start, end) and [hour_start, hour_end)
                overlap_start = start if start > hour_start else hour_start
                overlap_end = end if end < hour_end else hour_end
                overlap = (overlap_end - overlap_start).total_seconds()
                if overlap > 0:
                    label = time(h, 0).strftime("%H:%M")
                    used_seconds_by_hour[label] += overlap

            cur_day = cur_day + timedelta(days=1)

    # Process sessions (use end_time or clip to period_end_exclusive)
    for s in relevant_sessions:
        s_end = s.end_time if s.end_time is not None else period_end_dt_exclusive
        add_session_to_buckets(s.start_time, s_end)

    # ---- compute utilization per hour ----
    num_booths = len(booth_uuid_list)
    available_seconds_per_hour_across_period = num_booths * 3600 * days

    hours_out = []
    for label in hour_labels:
        used = used_seconds_by_hour[label]
        utilization = 0.0
        if available_seconds_per_hour_across_period > 0:
            utilization = used / float(available_seconds_per_hour_across_period)
            # clamp 0..1
            if utilization < 0:
                utilization = 0.0
            if utilization > 1:
                utilization = 1.0
        hours_out.append({"time": label, "utilization": round(utilization, 4)})  # 4 decimal places

    return HourlyUtilizationResponse(
        workday_start=workday_start.strftime("%H:%M"),
        workday_end=workday_end.strftime("%H:%M"),
        hours=hours_out,
    )

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
