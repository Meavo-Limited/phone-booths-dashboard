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
import { Box, Heading } from "@chakra-ui/react"

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

    useEffect(() => {
        async function load() {
            try {
                setLoading(true)

                const boothIdsString = boothIds.join(",")

                const res = await UsageSessionsService.hourlyUtilization({
                    boothIds: boothIdsString,
                    startDate,
                    endDate,
                })

                // Transform API response -> chart format
                const transformed: ChartPoint[] = res.hours.map((item) => ({
                    hour: item.time,
                    utilization: Number((item.utilization * 100).toFixed(2)), // convert 0.23 → 23.00
                }))

                setChartData(transformed)
            } catch (err) {
                console.error("Failed to load hourly utilization:", err)
            } finally {
                setLoading(false)
            }
        }

        load()
    }, [boothIds, startDate, endDate])

    if (loading) return <div>Loading hourly utilization...</div>

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
