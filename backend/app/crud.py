import uuid
from datetime import datetime
from typing import Any

from sqlmodel import Session, select

from app.core.security import get_password_hash, verify_password
from app.models.item_model import Item, ItemCreate
from app.models.user_model import User, UserCreate, UserUpdate
from app.models.sensor_events import SensorEvent, SensorEventCreate
from app.models.usage_sessions import UsageSession, UsageSessionCreate


def create_user(*, session: Session, user_create: UserCreate) -> User:
    db_obj = User.model_validate(
        user_create, update={"hashed_password": get_password_hash(user_create.password)}
    )
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def update_user(*, session: Session, db_user: User, user_in: UserUpdate) -> Any:
    user_data = user_in.model_dump(exclude_unset=True)
    extra_data = {}
    if "password" in user_data:
        password = user_data["password"]
        hashed_password = get_password_hash(password)
        extra_data["hashed_password"] = hashed_password
    db_user.sqlmodel_update(user_data, update=extra_data)
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user


def get_user_by_email(*, session: Session, email: str) -> User | None:
    statement = select(User).where(User.email == email)
    session_user = session.exec(statement).first()
    return session_user


def authenticate(*, session: Session, email: str, password: str) -> User | None:
    db_user = get_user_by_email(session=session, email=email)
    if not db_user:
        return None
    if not verify_password(password, db_user.hashed_password):
        return None
    return db_user


def create_item(*, session: Session, item_in: ItemCreate, owner_id: uuid.UUID) -> Item:
    db_item = Item.model_validate(item_in, update={"owner_id": owner_id})
    session.add(db_item)
    session.commit()
    session.refresh(db_item)
    return db_item


def create_sensor_event(
    *,
    session: Session,
    sensor_event_in: SensorEventCreate,
    raw_payload: dict | None = None,
) -> SensorEvent:
    """Create a new sensor event."""
    db_event = SensorEvent.model_validate(
        sensor_event_in, update={"raw_payload": raw_payload}
    )
    session.add(db_event)
    session.commit()
    session.refresh(db_event)
    return db_event

def create_sensor_event_transaction(
    session: Session,
    sensor_event_in: SensorEventCreate,
    raw_payload: dict,
) -> SensorEvent:
    db_event = SensorEvent(
        **sensor_event_in.model_dump(),
        raw_payload=raw_payload,
    )
    session.add(db_event)

    return db_event

def create_usage_session(
    *, session: Session, usage_session_in: UsageSessionCreate
) -> UsageSession:
    """Create a new usage session."""
    db_session = UsageSession.model_validate(usage_session_in)
    session.add(db_session)
    session.commit()
    session.refresh(db_session)
    return db_session

def create_usage_session_transaction(
    *, session: Session, usage_session_in: UsageSessionCreate
) -> UsageSession:
    """Create a new usage session."""
    db_session = UsageSession.model_validate(usage_session_in)
    session.add(db_session)
    
    return db_session