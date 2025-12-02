from datetime import datetime, timedelta, date, timezone
from typing import Any
from app.models.general_models import DashboardStatsResponse
from fastapi import APIRouter, Depends, Query
from sqlmodel import select, func

from app.api.deps import SessionDep, CurrentUser
from app.models.phone_booths import PhoneBooth
from app.models.booth_states import BoothState
from app.models.usage_sessions import UsageSession
import logging
from pprint import pformat


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/stats", response_model=DashboardStatsResponse)
def dashboard_stats(
    session: SessionDep, 
    current_user: CurrentUser,
    start_date: date = date.today() - timedelta(days=7),
    end_date: date = date.today(),
) -> Any:
    # Determine the base query for booths
    if current_user.is_superuser:
        booths_query = select(PhoneBooth)
    else:
        if not current_user.client_id:
            return DashboardStatsResponse(
                total_booths=0, booths_in_use=0, usage_rate=0.0, time_at_max_capacity="0m"
            )
        booths_query = select(PhoneBooth).where(PhoneBooth.client_id == current_user.client_id)

    booths = session.exec(booths_query).all()
    total_booths = len(booths)
    booth_ids = [b.id for b in booths]

    # Booths currently in use (state_id == 1)
    booths_in_use = sum(1 for b in booths if b.state_id == 1)

    start_datetime = datetime.combine(start_date, datetime.min.time()).replace(tzinfo=timezone.utc)
    end_datetime = datetime.combine(end_date, datetime.max.time()).replace(tzinfo=timezone.utc)

    # Usage rate = sum(duration_seconds) / (working_hours * 3600 * number_of_booths)
    if booth_ids and total_booths > 0:
        sessions_query = select(UsageSession).where(
            UsageSession.phone_booth_id.in_(booth_ids),
            UsageSession.start_time >= start_datetime,
            UsageSession.start_time <= end_datetime,
        )
        
        logger.info(f"Dashboard query start_data: {start_datetime}, end_date: {end_datetime}")
        sessions = session.exec(sessions_query).all()
        

        total_seconds_used = sum(s.duration_seconds or 0 for s in sessions)
        logger.info(f"Total seconds used in last 7 days: {total_seconds_used}")
        total_possible_seconds = 0
        for b in booths:
            working_days = count_working_days_in_range(start_datetime, end_datetime, b.working_days_mask)
            total_possible_seconds += b.working_hours * 3600 * working_days
        logger.info(f"Total possible seconds in last 7 days: {total_possible_seconds}")
        usage_rate = (total_seconds_used / total_possible_seconds) * 100 if total_possible_seconds else 0
    else:
        usage_rate = 0

    # Time at max capacity = cumulative seconds when all booths busy simultaneously
    # For MVP, approximate by summing durations of sessions where booth count = total booths at that time
    # (accurate per-hour calculation can be added later)
    # Simple approximation: if all booths had overlapping sessions, sum min(duration)
    time_at_max_seconds = 0
    if booth_ids and total_booths > 0 and sessions:
        # Build event list: (timestamp, +1 or -1)
        events = []

        analysis_start = start_datetime
        analysis_end = end_datetime

        for s in sessions:
            s_start = max(s.start_time, analysis_start)
            s_end = s.end_time or end_datetime  # ongoing sessions count toward max

            # Only include if session overlaps the analysis window
            if s_end > analysis_start and s_start < analysis_end:
                events.append((s_start, +1))
                events.append((s_end, -1))

        # Sort events by time
        events.sort(key=lambda x: x[0])
        # logger.info("Events:\n%s", pformat(events))

        active = 0
        last_timestamp = None

        for timestamp, delta in events:
            # Helper logs to understand how the max time counting works - 
            # Resources - Sweep line algorithm, Maximum Number of Overlapping Intervals, LeetCode “Meeting Rooms II” solution  
            # logger.info(f"Event: {timestamp} delta: {delta} active before: {active}")
            if last_timestamp is not None and active == total_booths:
                # Add the interval where all booths were full
                time_at_max_seconds += (timestamp - last_timestamp).total_seconds()
                # logger.info(f"  -> Adding to time_at_max: {(timestamp - last_timestamp).total_seconds()}s") 

            active += delta
            last_timestamp = timestamp

    hours, remainder = divmod(time_at_max_seconds, 3600)
    minutes = remainder // 60
    time_at_max_str = f"{int(hours)}h {int(minutes)}m"

    return DashboardStatsResponse(
        total_booths=total_booths,
        booths_in_use=booths_in_use,
        usage_rate=round(usage_rate, 2),
        time_at_max_capacity=time_at_max_str,
    )

def count_working_days_in_range(start: datetime, end: datetime, bitmask: int) -> int:
    current = start.date()
    end_date = end.date()
    count = 0
    
    while current <= end_date:
        weekday = current.weekday()  # Monday = 0 ... Sunday = 6
        if bitmask & (1 << weekday):
            count += 1
        current += timedelta(days=1)
    
    return count

