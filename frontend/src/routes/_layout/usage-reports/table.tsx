import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import {
  Container,
  Heading,
  Spinner,
  Text,
} from "@chakra-ui/react"
import { RangeDatepicker } from "chakra-dayzed-datepicker"
import PhoneBoothTreeFilter from "@/components/Common/PhoneBoothFilterTree"
import { useUsageReportsData } from "@/hooks/useUsageReportsData"
import { UsageTable } from "@/components/UsageReports/UsageTable"
import { HourlyUtilizationContainer } from "@/components/UsageReports/HourlyUtilizationChart"


export const Route = createFileRoute("/_layout/usage-reports/table")({
  component: UsageReportsTablePage,
})

function UsageReportsTablePage() {
  const [checkedItems, setCheckedItems] = useState<string[]>([])
  const today = new Date()
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(today.getDate() - 6)
  const [selectedDates, setSelectedDates] = useState<Date[]>([
    sevenDaysAgo,
    today,
  ])

  const {
    chartData,
    boothIds,
    boothMap,
    isLoading,
    isError,
    error,
  } = useUsageReportsData(
    checkedItems,
    selectedDates.length === 2
      ? [selectedDates[0], selectedDates[1]]
      : undefined
  )

  const startStr =
    selectedDates.length === 2
      ? selectedDates[0].toISOString().slice(0, 10)
      : undefined
  const endStr =
    selectedDates.length === 2
      ? selectedDates[1].toISOString().slice(0, 10)
      : undefined

  return (
    <Container maxW="full" pt={12}>
      <Heading size="lg" mb={4}>
        Usage Reports - Summary Table
      </Heading>

      <PhoneBoothTreeFilter onCheckedChange={setCheckedItems} />

      <RangeDatepicker
        selectedDates={selectedDates}
        onDateChange={setSelectedDates}
      />

      {isLoading && <Spinner mt={6} />}
      {isError && <Text color="red.500">Error: {error?.message}</Text>}
      {!isLoading && chartData.length === 0 && (
        <Text mt={6}>No usage data found for the selected booths.</Text>
      )}

      {chartData.length > 0 && (
        <UsageTable
          data={chartData}
          boothIds={boothIds}
          boothMap={boothMap}
          selectedDates={selectedDates}
        />
      )}

      {/* ⬇️ ADD HOURLY UTILIZATION CHART HERE */}
      {boothIds.length > 0 && startStr && endStr && (
        <HourlyUtilizationContainer
          boothIds={boothIds}
          startDate={startStr}
          endDate={endStr}
        />
      )}
    </Container>
  )
}