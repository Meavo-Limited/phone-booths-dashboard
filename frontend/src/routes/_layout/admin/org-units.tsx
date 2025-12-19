import { Badge, Container, Flex, Heading, Table, Select, createListCollection } from "@chakra-ui/react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { z } from "zod"
import { useState, useEffect } from "react"

import { type OrgUnitRead, OrgUnitsService, ClientsService, type UserPublic } from "@/client"
import AddOrgUnit from "@/components/Admin/AddOrgUnit"
import {
  PaginationItems,
  PaginationNextTrigger,
  PaginationPrevTrigger,
  PaginationRoot,
} from "@/components/ui/pagination.tsx"
import { OrgUnitActionsMenu } from "@/components/Common/OrgUnitActionsMenu"
import { Field } from "@/components/ui/field"
import PhoneBoothTreeFilter from "@/components/Common/PhoneBoothFilterTree"

const orgUnitsSearchSchema = z.object({
  page: z.number().catch(1),
})

const PER_PAGE = 10

function getOrgUnitsQueryOptions({ page }: { page: number }) {
  return {
    queryFn: () => OrgUnitsService.readOrgUnits(),
    queryKey: ["orgUnits", { page }],
  }
}

function getOrgUnitsByClientQueryOptions({ clientId, page }: { clientId: string; page: number }) {
  return {
    queryFn: () => OrgUnitsService.readOrgUnitsByClient({ clientId }),
    queryKey: ["orgUnits", "byClient", clientId, { page }],
  }
}

function getClientsQuery() {
  return {
    queryKey: ["clients"],
    queryFn: () => ClientsService.readClients(),
  }
}

export const Route = createFileRoute("/_layout/admin/org-units")({
  component: OrgUnits,
  validateSearch: (search) => orgUnitsSearchSchema.parse(search),
})

function ClientFilter({ 
  selectedClient, 
  onClientChange 
}: { 
  selectedClient: string | null
  onClientChange: (clientId: string | null) => void 
}) {
  const { data: clients } = useQuery(getClientsQuery())

  const clientsCollection = createListCollection({
    items: [
      // { label: "All Clients", value: "all" },
      ...(clients?.map((client) => ({
        label: client.name,
        value: client.id,
      })) ?? [])
    ],
  })

  return (
    <Field label="Filter by Client" width="300px">
      <Select.Root
        collection={clientsCollection}
        size="sm"
        value={selectedClient ? [selectedClient] : ["all"]}
        onValueChange={(details) => {
          const value = details.value[0]
          onClientChange(value === "all" ? null : value)
        }}
      >
        <Select.HiddenSelect />
        <Select.Control>
          <Select.Trigger>
            <Select.ValueText placeholder="Select client" />
          </Select.Trigger>
          <Select.IndicatorGroup>
            <Select.Indicator />
          </Select.IndicatorGroup>
        </Select.Control>
        <Select.Positioner>
          <Select.Content>
            {clientsCollection.items.map((client: any) => (
              <Select.Item item={client} key={client.value}>
                {client.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
      </Select.Root>
    </Field>
  )
}

function OrgUnitsTable({ selectedClient }: { selectedClient: string | null }) {
  const queryClient = useQueryClient()
  const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"])
  const navigate = useNavigate({ from: Route.fullPath })
  const { page } = Route.useSearch()

  // Use different query based on whether a client is selected
  const { data: orgUnitsData, isLoading } = useQuery(
    selectedClient
      ? getOrgUnitsByClientQueryOptions({ clientId: selectedClient, page })
      : getOrgUnitsQueryOptions({ page })
  )

  const setPage = (page: number) => {
    navigate({
      to: "/admin/org-units",
      search: (prev) => ({ ...prev, page }),
    })
  }

  // Paginate manually since API returns all
  const allOrgUnits = orgUnitsData ?? []
  const startIndex = (page - 1) * PER_PAGE
  const endIndex = startIndex + PER_PAGE
  const orgUnits = allOrgUnits.slice(startIndex, endIndex)
  const count = allOrgUnits.length

  // Helper to get org unit type name
  const getTypeName = (typeId: number | null) => {
    const typeMap: Record<number, string> = {
      0: "Region",
      1: "Office",
      2: "Department",
      3: "Floor",
    }
    return typeId !== null ? typeMap[typeId] || "Unknown" : "N/A"
  }

  // Helper to get parent name
  const getParentName = (parentId: string | null) => {
    if (!parentId) return "N/A"
    const parent = allOrgUnits.find((unit) => unit.id === parentId)
    return parent?.name || "Unknown"
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <>
      <Table.Root size={{ base: "sm", md: "md" }}>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader w="md">Name</Table.ColumnHeader>
            <Table.ColumnHeader w="sm">Type</Table.ColumnHeader>
            <Table.ColumnHeader w="sm">Parent</Table.ColumnHeader>
            <Table.ColumnHeader w="sm">Timezone</Table.ColumnHeader>
            <Table.ColumnHeader w="sm">Client</Table.ColumnHeader>
            <Table.ColumnHeader w="sm">Actions</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {orgUnits?.map((orgUnit) => (
            <Table.Row key={orgUnit.id}>
              <Table.Cell>{orgUnit.name}</Table.Cell>
              <Table.Cell>{getTypeName(orgUnit.type_id || 0)}</Table.Cell>
              <Table.Cell>{getParentName(orgUnit.parent_id)}</Table.Cell>
              <Table.Cell truncate maxW="sm">
                {orgUnit.timezone || "N/A"}
              </Table.Cell>
              <Table.Cell>{orgUnit.client_id}</Table.Cell>
              <Table.Cell>
                <OrgUnitActionsMenu orgUnit={orgUnit} />
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
      <Flex justifyContent="flex-end" mt={4}>
        <PaginationRoot
          count={count}
          pageSize={PER_PAGE}
          page={page}
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

function OrgUnits() {
  const [selectedClient, setSelectedClient] = useState<string | null>(null)
  const { data: clients } = useQuery(getClientsQuery())

  console.log("Selected Client:", selectedClient)

  // Auto-select first client when clients are loaded
  useEffect(() => {
    if (clients && clients.length > 0 && !selectedClient) {
      setSelectedClient(clients[0].id)
    }
  }, [clients, selectedClient])

  return (
    <Container maxW="full">
      <Heading size="lg" pt={12}>
        Organization Units Management
      </Heading>

      <Flex direction="column" gap={4} my={4}>
        <ClientFilter 
          selectedClient={selectedClient} 
          onClientChange={setSelectedClient} 
        />
        <AddOrgUnit selectedClient={selectedClient} />
      </Flex>
      
      <OrgUnitsTable selectedClient={selectedClient} />
      <PhoneBoothTreeFilter />
    </Container>
  )
}
