import { Badge, Container, Flex, Heading, Table } from "@chakra-ui/react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { z } from "zod"

import { type OrgUnitRead, OrgUnitsService, type UserPublic } from "@/client"
import AddOrgUnit from "@/components/Admin/AddOrgUnit"
import {
  PaginationItems,
  PaginationNextTrigger,
  PaginationPrevTrigger,
  PaginationRoot,
} from "@/components/ui/pagination.tsx"
import { OrgUnitActionsMenu } from "@/components/Common/OrgUnitActionsMenu"

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

export const Route = createFileRoute("/_layout/admin/org-units")({
  component: OrgUnits,
  validateSearch: (search) => orgUnitsSearchSchema.parse(search),
})

function OrgUnitsTable() {
  const queryClient = useQueryClient()
  const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"])
  const navigate = useNavigate({ from: Route.fullPath })
  const { page } = Route.useSearch()

  const { data: orgUnitsData, isLoading } = useQuery({
    ...getOrgUnitsQueryOptions({ page }),
  })

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
  return (
    <Container maxW="full">
      <Heading size="lg" pt={12}>
        Organization Units Management
      </Heading>

      <AddOrgUnit />
      <OrgUnitsTable />
    </Container>
  )
}
