import { IconButton } from "@chakra-ui/react"
import { BsThreeDotsVertical } from "react-icons/bs"
import type { OrgUnitRead } from "@/client"
import { MenuContent, MenuRoot, MenuTrigger } from "../ui/menu"
import EditOrgUnit from "../Admin/EditOrgUnit"
import DeleteOrgUnit from "../Admin/DeleteOrgUnit"

interface OrgUnitActionsMenuProps {
  orgUnit: OrgUnitRead
  disabled?: boolean
}

export const OrgUnitActionsMenu = ({ orgUnit, disabled }: OrgUnitActionsMenuProps) => {
  return (
    <MenuRoot>
      <MenuTrigger asChild>
        <IconButton variant="ghost" color="inherit" disabled={disabled}>
          <BsThreeDotsVertical />
        </IconButton>
      </MenuTrigger>
      <MenuContent>
        <EditOrgUnit orgUnit={orgUnit} />
        <DeleteOrgUnit id={orgUnit.id} />
      </MenuContent>
    </MenuRoot>
  )
}
