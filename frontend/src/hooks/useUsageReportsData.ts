import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import { UsageSessionsService, PhoneBoothsService } from "@/client"

// src/utils/dateUtils.ts
export function getDateRange(start: Date, end: Date): string[] {
  const dates: string[] = []
  const current = new Date(start)
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0])
    current.setDate(current.getDate() + 1)
  }
  return dates
}

// --- Utility: generate chart data with zero-usage days filled ---
function prepareUsageChartData(data: any[], checkedItems: string[]) {
  if (!data || data.length === 0) return []

  const filtered = checkedItems.length
    ? data.filter((s: any) => checkedItems.includes(s.phone_booth_id))
    : data

  const usage: Record<string, Record<string, number>> = {}
  let minDate: Date | null = null
  let maxDate: Date | null = null

  for (const session of filtered) {
    if (!session.start_time || !session.duration_seconds) continue
    const day = new Date(session.start_time).toISOString().split("T")[0]
    const boothId = session.phone_booth_id
    if (!usage[day]) usage[day] = {}
    usage[day][boothId] = (usage[day][boothId] || 0) + session.duration_seconds

    const dateObj = new Date(session.start_time)
    if (!minDate || dateObj < minDate) minDate = dateObj
    if (!maxDate || dateObj > maxDate) maxDate = dateObj
  }

  if (!minDate || !maxDate) return []

  const allDays = getDateRange(minDate, maxDate)

  return allDays.map((day) => {
    const booths = usage[day] || {}
    const entry: any = { day }
    for (const [boothId, totalSeconds] of Object.entries(booths)) {
      entry[boothId] = totalSeconds / 3600
    }
    entry.totalHours = Object.values(booths).reduce(
      (sum, sec) => sum + (sec as number) / 3600,
      0
    )
    return entry
  })
}

// Define types for booth data
interface BoothInfo {
  name: string
  workingHours: number
  workingDaysMask: number
}

// --- React Hook: unified data source for usage reports ---
export function useUsageReportsData(
  checkedItems: string[],
  dateRange?: [Date, Date]
) {
  const { data: sessions, isLoading, isError, error } = useQuery({
    queryKey: ["usageSessions"],
    queryFn: () => UsageSessionsService.readUsageSessions({ skip: 0, limit: 2000 }),
  })

  const { data: booths } = useQuery({
    queryKey: ["phoneBooths"],
    queryFn: () => PhoneBoothsService.readPhoneBooths({ skip: 0, limit: 2000 }),
  })

  console.log("Phone booths fetched:", booths);

  // 🧭 Map booth IDs → { name, workingHours }
  const boothMap = useMemo(() => {
    const map: Record<string, BoothInfo> = {}
    booths?.forEach((b: any) => {
      map[b.id] = {
        name: `${b.name} (${b.serial_number})`,
        workingHours: b.working_hours || 8, // Default to 8 if not specified
        workingDaysMask: b.working_days_mask || 0,
      }
    })
    return map
  }, [booths])

  // 🧮 Prepare usage data
  const chartData = useMemo(() => {
    let prepared = prepareUsageChartData(sessions || [], checkedItems)

    // 🕒 Apply date filter if provided
    if (dateRange && dateRange[0] && dateRange[1]) {
      const [start, end] = dateRange
      const startISO = start.toISOString().split("T")[0]
      const endISO = end.toISOString().split("T")[0]
      console.log("Filtering data from", startISO, "to", endISO);
      prepared = prepared.filter(d => d.day >= startISO && d.day <= endISO)
    }

    return prepared
  }, [sessions, checkedItems, dateRange])

  // 🪪 Extract booth IDs dynamically
  const boothIds = useMemo(() => {
    if (!chartData.length) return []
    const ids = new Set<string>()
    chartData.forEach(entry => {
      Object.keys(entry).forEach(key => {
        if (key !== "day" && key !== "totalHours") ids.add(key)
      })
    })
    return Array.from(ids)
  }, [chartData])

  return {
    chartData,
    boothIds,
    boothMap,
    isLoading,
    isError,
    error,
  }
}