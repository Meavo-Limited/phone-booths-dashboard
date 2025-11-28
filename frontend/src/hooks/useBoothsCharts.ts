import { useQuery } from "@tanstack/react-query"
import { UsageSessionsService, PhoneBoothsService } from "@/client"
import { useMemo } from "react"

export function useBoothCharts(boothIds: string[], dateRange: [Date, Date]) {
  const boothParam = boothIds.join(",")
  console.log("Booth IDs Param:", boothParam)

  const startDate = dateRange[0].toISOString().split("T")[0]
  const endDate = dateRange[1].toISOString().split("T")[0]

  // ⬅️ FIXED: camelCase field names per OpenAPI client
  const { data: chart, isLoading, isError } = useQuery({
    queryKey: ["boothCharts", boothParam, startDate, endDate],
    queryFn: () =>
      UsageSessionsService.usageReportsCharts({
        boothIds: boothParam,
        startDate,
        endDate
      })
  })

  console.log("Booth IDs Param booths query:", boothParam)
  const { data: booths } = useQuery({
    queryKey: ["phoneBoothsByIds", boothParam],
    queryFn: () =>
      PhoneBoothsService.readPhoneBoothsByIds({
        boothIds: boothParam
      })
  })

  console.log("Booths Data:", booths)

  const boothMap = useMemo(() => {
    const m: Record<string, any> = {}
    booths?.forEach((b: any) => {
      m[b.id] = b
    })
    return m
  }, [booths])

  console.log("Booth Map:", boothMap)

  return {
    chart,
    boothMap,
    isLoading,
    isError
  }
}
