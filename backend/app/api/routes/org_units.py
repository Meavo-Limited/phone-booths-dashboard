import uuid
from typing import Any, List

from fastapi import APIRouter, HTTPException, status
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.models.org_units import OrgUnit, OrgUnitCreate, OrgUnitRead
from app.models.general_models import Message

router = APIRouter(prefix="/org-units", tags=["org_units"]) 


@router.get("/", response_model=List[OrgUnitRead])
def read_org_units(session: SessionDep, current_user: CurrentUser) -> Any:
    """List org units. Superusers see all; others limited to their client."""
    if current_user.is_superuser:
        statement = select(OrgUnit)
    else:
        if not current_user.client_id:
            return []
        statement = select(OrgUnit).where(OrgUnit.client_id == current_user.client_id)
    units = session.exec(statement).all()
    return units


@router.get("/{id}", response_model=OrgUnitRead)
def read_org_unit(session: SessionDep, current_user: CurrentUser, id: uuid.UUID) -> Any:
    unit = session.get(OrgUnit, id)
    if not unit:
        raise HTTPException(status_code=404, detail="Org unit not found")
    if not current_user.is_superuser and unit.client_id != current_user.client_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return unit

@router.get("/by-client/{client_id}", response_model=List[OrgUnitRead])
def read_org_units_by_client(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    client_id: uuid.UUID,
) -> Any:
    """
    List org units for a specific client.

    - Superusers can access any client
    - Non-superusers can only access their own client
    """
    if not current_user.is_superuser and current_user.client_id != client_id:
        if not current_user.client_id:
            raise HTTPException(status_code=403, detail="Not enough permissions")
        if current_user.client_id != client_id:
            raise HTTPException(status_code=403, detail="Not enough permissions")

    statement = select(OrgUnit).where(OrgUnit.client_id == client_id)
    units = session.exec(statement).all()
    return units


@router.post("/", response_model=OrgUnitRead, status_code=status.HTTP_201_CREATED)
def create_org_unit(*, session: SessionDep, current_user: CurrentUser, unit_in: OrgUnitCreate) -> Any:
    # allow superusers or users creating units for their own client
    if not current_user.is_superuser and unit_in.client_id != current_user.client_id:
        raise HTTPException(status_code=403, detail="Not enough privileges")
    
    validate_org_unit_parent(
        session=session,
        parent_id=unit_in.parent_id,
        child_type_id=unit_in.type_id,
    )
    
    unit = OrgUnit.model_validate(unit_in)
    session.add(unit)
    session.commit()
    session.refresh(unit)
    return unit


@router.put("/{id}", response_model=OrgUnitRead)
def update_org_unit(*, session: SessionDep, current_user: CurrentUser, id: uuid.UUID, unit_in: OrgUnitCreate) -> Any:
    unit = session.get(OrgUnit, id)
    if not unit:
        raise HTTPException(status_code=404, detail="Org unit not found")
    if not current_user.is_superuser and unit.client_id != current_user.client_id:
        raise HTTPException(status_code=403, detail="Not enough privileges")
    
    validate_org_unit_parent(
        session=session,
        parent_id=unit_in.parent_id,
        child_type_id=unit_in.type_id,
    )
    
    update_data = unit_in.model_dump(exclude_unset=True)
    unit.sqlmodel_update(update_data)
    session.add(unit)
    session.commit()
    session.refresh(unit)
    return unit


@router.delete("/{id}", response_model=Message)
def delete_org_unit(session: SessionDep, current_user: CurrentUser, id: uuid.UUID) -> Any:
    unit = session.get(OrgUnit, id)
    if not unit:
        raise HTTPException(status_code=404, detail="Org unit not found")
    if not current_user.is_superuser and unit.client_id != current_user.client_id:
        raise HTTPException(status_code=403, detail="Not enough privileges")
    session.delete(unit)
    session.commit()
    return Message(message="Org unit deleted successfully")


def validate_org_unit_parent(
    *,
    session: SessionDep,
    parent_id: uuid.UUID | None,
    child_type_id: int | None,
) -> None:
    if parent_id is None:
        return

    parent = session.get(OrgUnit, parent_id)
    if not parent:
        raise HTTPException(
            status_code=400,
            detail="Parent organization unit does not exist",
        )

    if parent.type_id is None or child_type_id is None:
        return

    if parent.type_id >= child_type_id:
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid org unit hierarchy: "
                "parent type must be broader than child type"
            ),
        )
