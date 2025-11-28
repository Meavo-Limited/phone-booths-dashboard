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
import EditWorkdays from "@/components/PhoneBooths/EditWorkdays"

export type PhoneBoothsRead = {
    data: Array<PhoneBoothRead>
    count: number
}

const phoneBoothsSearchSchema = z.object({
    page: z.number().catch(1),
})

const PER_PAGE = 5

export const Route = createFileRoute("/_layout/phone-booths")({
    component: PhoneBoothsPage,
    validateSearch: (search) => phoneBoothsSearchSchema.parse(search),
})

// API call
function getPhoneBooths({ page }: { page: number }) {
    return {
        queryFn: () =>
            PhoneBoothsService.readPhoneBoothsPaginated({
                skip: (page - 1) * PER_PAGE,
                limit: PER_PAGE,
            }),
        queryKey: ["phoneBooths", { page }],
    }
}

// Decode working days mask -> text
function decodeWorkingDays(mask: number) {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    return days.filter((_, i) => (mask & (1 << i)) !== 0).join(", ")
}

function PhoneBoothsTable({ booths }: { booths: PhoneBoothRead[] }) {
    return (
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
                    <Table.Row key={booth.id}>
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
    )
}

function PhoneBoothsPage() {
    const { page } = Route.useSearch()
    const navigate = useNavigate({ from: Route.fullPath })

    const { data, isLoading } = useQuery({
        ...getPhoneBooths({ page }),
        placeholderData: (prev) => prev,
    })

    const booths = data?.data ?? []
    const total = data?.count ?? 0

    if (isLoading) return <PendingItems />

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

    const setPage = (page: number) =>
        navigate({
            to: "/phone-booths",
            search: (prev) => ({ ...prev, page }),
        })

    return (
        <Container maxW="full">
            <Heading size="lg" pt={12} mb={4}>
                Phone Booths
            </Heading>

            {/* Pass first booth to dialog */}
            <EditWorkdays booths={booths} />

            <PhoneBoothsTable booths={booths} />

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
        </Container>
    )
}
