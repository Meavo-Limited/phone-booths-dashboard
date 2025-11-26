from fastapi import APIRouter

from app.api.routes import (
    items,
    login,
    private,
    users,
    utils,
    clients,
    org_unit_types,
    org_units,
    roles,
    booth_states,
    phone_booths,
    sensors,
    sensor_events,
    usage_sessions,
    dashboard,
)
from app.core.config import settings

api_router = APIRouter()
api_router.include_router(login.router)
api_router.include_router(users.router)
api_router.include_router(utils.router)
api_router.include_router(items.router)
api_router.include_router(clients.router)
api_router.include_router(org_unit_types.router)
api_router.include_router(org_units.router)
api_router.include_router(roles.router)
api_router.include_router(booth_states.router)
api_router.include_router(phone_booths.router)
api_router.include_router(sensors.router)
api_router.include_router(sensor_events.router)
api_router.include_router(usage_sessions.router)
api_router.include_router(dashboard.router)


if settings.ENVIRONMENT == "local":
    api_router.include_router(private.router)
