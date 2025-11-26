from pydantic import BaseModel
from sqlmodel import Field, Relationship, SQLModel


# Generic message
class Message(SQLModel):
    message: str
    
class DashboardStatsResponse(BaseModel):
    total_booths: int
    booths_in_use: int
    usage_rate: float  # percentage 0-100
    time_at_max_capacity: str  # e.g., "1h 45m"