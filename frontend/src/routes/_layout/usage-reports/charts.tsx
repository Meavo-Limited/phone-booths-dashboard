import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import {
  Container,
  Heading,
  Spinner,
  Text,
  Stack,
} from "@chakra-ui/react"
import { RangeDatepicker } from "chakra-dayzed-datepicker"
import PhoneBoothTreeFilter from "@/components/Common/PhoneBoothFilterTree"
import { UsageLineChart } from "@/components/UsageReports/UsageLineChart"
import { UsageBarChart } from "@/components/UsageReports/UsageBarChart"
import { UsageCompositeChart } from "@/components/UsageReports/TotalHoursAndAvgPerBooth"
import { useBoothCharts } from "@/hooks/useBoothsCharts"

export const Route = createFileRoute("/_layout/usage-reports/charts")({
  component: UsageReportsChartsPage,
})

function UsageReportsChartsPage() {
  const [checkedItems, setCheckedItems] = useState<string[]>([])
  const today = new Date()
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(today.getDate() - 6)
  const [selectedDates, setSelectedDates] = useState<Date[]>([sevenDaysAgo, today])

  // ---- USE UPDATED BOOTH CHARTS HOOK ----
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

  return (
    <Container maxW="full" pt={12}>
      <Heading size="lg" mb={4}>
        Usage Reports - Charts
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
        <Stack gap="10" mt={8}>
          <UsageLineChart data={flattenedChartData} />

          <UsageBarChart
            data={flattenedChartData}
            boothMap={boothMap}
          />

          <UsageCompositeChart
            data={flattenedChartData}
            boothMap={boothMap}
          />
        </Stack>
      )}
    </Container>
  )
}
