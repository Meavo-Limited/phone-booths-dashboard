import { useMemo } from "react"
import { Box, Heading, Table } from "@chakra-ui/react"
import { PhoneBoothRead } from "@/client"


interface Props {
  data: any[]
  boothMap: Record<string, PhoneBoothRead>
  selectedDates: Date[]
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

// Convert working_days_mask → "Mon, Tue, Thu"
function maskToDays(mask: number): string {
  return DAY_LABELS.filter((_, idx) => mask & (1 << idx)).join(", ")
}

// Count how many working days occur in the selected date range
function countWorkingDaysInRange(start: Date, end: Date, mask: number): number {
  let count = 0
  const current = new Date(start)

  while (current <= end) {
    const jsDay = current.getDay() // 0=Sun, 1=Mon, ..., 6=Sat

    // Convert JS day → our bitmask index (Mon=0 → Sun=6)
    const bitIndex = jsDay === 0 ? 6 : jsDay - 1

    if (mask & (1 << bitIndex)) count++

    current.setDate(current.getDate() - 0 + 1)
  }

  return count
}

export function UsageTable({ data, boothMap, selectedDates }: Props) {
  const summaryData = useMemo(() => {
    const boothIds = Object.keys(boothMap)

    if (!data.length || !boothIds.length) return []

    const start =
      selectedDates.length === 2 ? selectedDates[0] : selectedDates[0]
    const end =
      selectedDates.length === 2 ? selectedDates[1] : selectedDates[0]

    return boothIds.map((boothId) => {
      const booth = boothMap[boothId]
      if (!booth) return null

      const workingHours = booth.working_hours || 8
      const mask = booth.working_days_mask

      const workingDaysCount = countWorkingDaysInRange(start, end, mask)

      const totalAvailableHours = workingDaysCount * workingHours

      const totalUsage = data.reduce(
        (sum, day) => sum + (day[boothId] || 0),
        0
      )

      const percentage =
        totalAvailableHours > 0
          ? (totalUsage / totalAvailableHours) * 100
          : 0

      return {
        id: boothId,
        booth: booth.name,
        workingHours,
        workingDays: maskToDays(mask),
        totalUsage,
        totalAvailableHours,
        percentage,
      }
    }).filter(Boolean)
  }, [data, boothMap, selectedDates])

  return (
    <Box mt={12}>
      <Heading size="md" mb={3}>
        Booth Usage Summary
      </Heading>

      <Table.Root size="sm" variant="outline">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Booth</Table.ColumnHeader>
            <Table.ColumnHeader>Working Days</Table.ColumnHeader>
            <Table.ColumnHeader>Hours/Day</Table.ColumnHeader>
            <Table.ColumnHeader>Usage (hrs)</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="end">Usage %</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {summaryData.map((item) => (
            <Table.Row key={item!.id}>
              <Table.Cell>{item!.booth}</Table.Cell>
              <Table.Cell>{item!.workingDays}</Table.Cell>
              <Table.Cell>{item!.workingHours}</Table.Cell>
              <Table.Cell>
                {item!.totalUsage.toFixed(2)}/{item!.totalAvailableHours}
              </Table.Cell>
              <Table.Cell textAlign="end">
                {item!.percentage.toFixed(1)}%
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  )
}
