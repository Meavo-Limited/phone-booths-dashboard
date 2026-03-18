import { useEffect, useState } from "react"
import { UsageSessionsService } from "@/client"   // adjust import path as needed
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
} from "recharts"
import { Box, Heading, Text } from "@chakra-ui/react"

interface ChartPoint {
    hour: string
    utilization: number
}

interface Props {
    boothIds: string[]        // multiple booth UUIDs
    startDate: string         // "YYYY-MM-DD"
    endDate: string           // "YYYY-MM-DD"
}

export function HourlyUtilizationContainer({ boothIds, startDate, endDate }: Props) {
    const [chartData, setChartData] = useState<ChartPoint[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function load() {
            try {
                setLoading(true)
                setError(null)

                const boothIdsString = boothIds.join(",")

                const res = await UsageSessionsService.hourlyUtilization({
                    boothIds: boothIdsString,
                    startDate,
                    endDate,
                })

                const transformed: ChartPoint[] = res.hours.map((item) => ({
                    hour: item.time,
                    utilization: Number((item.utilization * 100).toFixed(2)),
                }))

                setChartData(transformed)
            } catch (err: any) {
                console.error("Failed to load hourly utilization:", err)

                const detail =
                    err?.body?.detail ||
                    err?.response?.data?.detail ||
                    err?.message ||
                    ""

                if (detail.includes("same timezone")) {
                    setError(
                        "Selected phone booths are in different timezones. Please select booths within the same timezone to view this chart."
                    )
                } else {
                    setError("Failed to load hourly utilization chart.")
                }
            } finally {
                setLoading(false)
            }
        }

        load()
    }, [boothIds, startDate, endDate])

    if (loading) return <div>Loading hourly utilization...</div>

    if (error) {
        return (
            <Box mt={6}>
                <Heading size="md" mb={2}>
                    Utilization by Hour (%)
                </Heading>
                <Text color="orange.400">{error}</Text>
            </Box>
        )
    }

    return <HourlyUtilizationChart data={chartData} />
}

// The chart stays unchanged
export function HourlyUtilizationChart({ data }: { data: ChartPoint[] }) {
    return (
        <Box mt={12}>
            <Heading size="md" mb={3}>
                Utilization by Hour (%)
            </Heading>

            <ResponsiveContainer width="100%" height={350}>
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                    <Bar dataKey="utilization" fill="#3182ce" />
                </BarChart>
            </ResponsiveContainer>
        </Box>
    )
}
