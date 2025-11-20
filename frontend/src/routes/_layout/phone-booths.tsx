import {
    Container,
    EmptyState,
    Flex,
    Heading,
    Table,
    VStack,
} from "@chakra-ui/react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { FiSearch } from "react-icons/fi"
import { z } from "zod"

import { PhoneBoothsService, type PhoneBoothRead } from "@/client"
import {
    PaginationItems,
    PaginationNextTrigger,
    PaginationPrevTrigger,
    PaginationRoot,
} from "@/components/ui/pagination"
import PendingItems from "@/components/Pending/PendingItems"

export type PhoneBoothsRead = {
    data: Array<PhoneBoothRead>
    count: number
}

const phoneBoothsSearchSchema = z.object({
    page: z.number().catch(1),
})

const PER_PAGE = 5

export const Route = createFileRoute("/_layout/phone-booths")({
    component: PhoneBooths,
    validateSearch: (search) => phoneBoothsSearchSchema.parse(search),
})

// ------------------------------
// Server-side paginated API call
// ------------------------------
function getPhoneBooths({ page }: { page: number }) {
    return {
        queryFn: () =>
            PhoneBoothsService.readPhoneBoothsPaginated({ skip: (page - 1) * PER_PAGE, limit: PER_PAGE }),
        queryKey: ["phoneBooths", { page }],
    }
}

// Helper to decode working_days_mask
function decodeWorkingDays(mask: number) {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    return days.filter((_, i) => (mask & (1 << i)) !== 0).join(", ")
}
// ------------------------------
// Table Component
// ------------------------------
function PhoneBoothsTable() {
    const navigate = useNavigate({ from: Route.fullPath })
    const { page } = Route.useSearch()

    const { data, isLoading, isPlaceholderData } = useQuery({
        ...getPhoneBooths({ page }),
        placeholderData: (prevData) => prevData,
    })

    const booths = data?.data.slice(0, PER_PAGE) ?? []
    const total = data?.count ?? 0

    if (isLoading) {
        return <PendingItems />
    }

    // empty
    if (total === 0) {
        return (
            <EmptyState.Root>
                <EmptyState.Content>
                    <EmptyState.Indicator>
                        <FiSearch />
                    </EmptyState.Indicator>
                    <VStack textAlign="center">
                        <EmptyState.Title>No phone booths found</EmptyState.Title>
                    </VStack>
                </EmptyState.Content>
            </EmptyState.Root>
        )
    }

    const setPage = (page: number) => {
        navigate({
            to: "/phone-booths",
            search: (prev) => ({ ...prev, page }),
        })
    }

    return (
        <>
            <Table.Root size={{ base: "sm", md: "md" }}>
                <Table.Header>
                    <Table.Row>
                        <Table.ColumnHeader w="sm">Name</Table.ColumnHeader>
                        <Table.ColumnHeader w="sm">Serial Number</Table.ColumnHeader>
                        <Table.ColumnHeader w="sm">Workday Start</Table.ColumnHeader>
                        <Table.ColumnHeader w="sm">Workday End</Table.ColumnHeader>
                        <Table.ColumnHeader w="sm">Working Hours</Table.ColumnHeader>
                        <Table.ColumnHeader w="sm">Workdays</Table.ColumnHeader>
                    </Table.Row>
                </Table.Header>

                <Table.Body>
                    {booths.map((booth) => (
                        <Table.Row key={booth.id} opacity={isPlaceholderData ? 0.5 : 1}>
                            <Table.Cell truncate maxW="sm">{booth.name}</Table.Cell>
                            <Table.Cell truncate maxW="sm">{booth.serial_number}</Table.Cell>
                            <Table.Cell>{booth.workday_start}</Table.Cell>
                            <Table.Cell>{booth.workday_end}</Table.Cell>
                            <Table.Cell>{booth.working_hours} hrs</Table.Cell>
                            <Table.Cell>{decodeWorkingDays(booth.working_days_mask)}</Table.Cell>
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table.Root>

            <Flex justifyContent="flex-end" mt={4}>
                <PaginationRoot
                    count={total}
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

// ------------------------------
// Page Wrapper
// ------------------------------
function PhoneBooths() {
    return (
        <Container maxW="full">
            <Heading size="lg" pt={12} mb={4}>
                Phone Booths
            </Heading>

            <PhoneBoothsTable />
        </Container>
    )
}
