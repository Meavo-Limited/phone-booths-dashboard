import { IconButton } from "@chakra-ui/react"
import { BsThreeDotsVertical } from "react-icons/bs"

import type { ClientRead } from "@/client"
import { MenuContent, MenuRoot, MenuTrigger } from "@/components/ui/menu"
import EditClient from "../Admin/EditClient"
import DeleteClient from "../Admin/DeleteClient"

export const ClientActionsMenu = ({ client }: { client: ClientRead }) => {
  return (
    <MenuRoot>
      <MenuTrigger asChild>
        <IconButton variant="ghost">
          <BsThreeDotsVertical />
        </IconButton>
      </MenuTrigger>
      <MenuContent>
        <EditClient client={client} />
        <DeleteClient id={client.id} />
      </MenuContent>
    </MenuRoot>
  )
}
