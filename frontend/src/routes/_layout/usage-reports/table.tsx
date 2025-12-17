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
import { UsageTable } from "@/components/UsageReports/UsageTable"
import { HourlyUtilizationContainer } from "@/components/UsageReports/HourlyUtilizationChart"
import { useBoothCharts } from "@/hooks/useBoothsCharts"


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

    const { chart, boothMap, isLoading, isError } = useBoothCharts(
      checkedItems,                                     // booth IDs array
      selectedDates.length === 2
        ? [selectedDates[0], selectedDates[1]]
        : [sevenDaysAgo, today]                         // fallback range
    )
  
    const chartData = chart ?? []
  
    // Flatten chartDataNew for Recharts
    const flattenedChartData = chartData.map(dayEntry => {
      const { day, total_hours, booths } = dayEntry
      return {
        day,
        total_hours,
        ...booths, // spreads booth_id -> hours into top-level keys
      }
    })

  const startStr =
    selectedDates.length === 2
      ? selectedDates[0].toLocaleDateString("en-CA")
      : sevenDaysAgo.toLocaleDateString("en-CA")
  const endStr =
    selectedDates.length === 2
      ? selectedDates[1].toLocaleDateString("en-CA")
      : today.toLocaleDateString("en-CA")
  
  let boothIds: string[] = Object.keys(boothMap)

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
      {isError && <Text color="red.500">Error loading charts</Text>}
      {!isLoading && flattenedChartData.length === 0 && (
        <Text mt={6}>No usage data found for the selected booths.</Text>
      )}

      {flattenedChartData.length > 0 && (
        <UsageTable
          data={flattenedChartData}
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