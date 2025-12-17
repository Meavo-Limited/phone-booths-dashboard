import { Container, Flex, Heading, Table } from "@chakra-ui/react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { z } from "zod"

import { ClientsService, type ClientRead } from "@/client"
import PendingUsers from "@/components/Pending/PendingUsers"
import {
  PaginationItems,
  PaginationNextTrigger,
  PaginationPrevTrigger,
  PaginationRoot,
} from "@/components/ui/pagination"
import AddClient from "@/components/Admin/AddClient"
import { ClientActionsMenu } from "@/components/Common/ClientActionsMenu"

const searchSchema = z.object({
  page: z.number().catch(1),
})

const PER_PAGE = 5

function getClientsQueryOptions({ page }: { page: number }) {
  return {
    queryKey: ["clients", { page }],
    queryFn: () => ClientsService.readClients(),
  }
}

export const Route = createFileRoute("/_layout/admin/clients")({
  component: ClientsAdmin,
  validateSearch: (search) => searchSchema.parse(search),
})

function ClientsTable() {
  const navigate = useNavigate({ from: Route.fullPath })
  const { page } = Route.useSearch()

  const { data, isLoading } = useQuery(getClientsQueryOptions({ page }))

  if (isLoading) return <PendingUsers />

  const clients = data?.slice((page - 1) * PER_PAGE, page * PER_PAGE) ?? []
  const count = data?.length ?? 0

  const setPage = (page: number) => {
    navigate({
      to: "/admin/clients",
      search: (prev) => ({ ...prev, page }),
    })
  }

  return (
    <>
      <Table.Root size={{ base: "sm", md: "md" }}>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Name</Table.ColumnHeader>
            <Table.ColumnHeader>ID</Table.ColumnHeader>
            <Table.ColumnHeader>Created</Table.ColumnHeader>
            <Table.ColumnHeader>Actions</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {clients.map((client: ClientRead) => (
            <Table.Row key={client.id}>
              <Table.Cell>{client.name}</Table.Cell>
              <Table.Cell>{client.id}</Table.Cell>
              <Table.Cell>
                {new Date(client.created_at).toLocaleDateString()}
              </Table.Cell>
              <Table.Cell>
                <ClientActionsMenu client={client} />
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>

      <Flex justifyContent="flex-end" mt={4}>
        <PaginationRoot
          count={count}
          pageSize={PER_PAGE}
          onPageChange={({ page }) => setPage(page)}
        >
          <Flex>
            <PaginationPrevTrigger />
            <PaginationItems />
            <PaginationNextTrigger />
          </Flex>
        </PaginationRoot>
      </Flex>
    </>
  )
}

function ClientsAdmin() {
  return (
    <Container maxW="full">
      <Heading size="lg" pt={12}>
        Clients Management
      </Heading>

      <AddClient />
      <ClientsTable />
    </Container>
  )
}
