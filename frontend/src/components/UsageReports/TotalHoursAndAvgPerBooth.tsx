import {
    Box,
    Heading,
} from "@chakra-ui/react"
import {
    ResponsiveContainer,
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    CartesianGrid,
} from "recharts"

interface Props {
    data: any[]
    boothIds: string[]
}

export function UsageCompositeChart({ data, boothIds }: Props) {
    if (!data.length) return null

    const boothCount = boothIds.length || 1

    // Transform chartData → totals + avg per day
    const mergedData = data.map((day) => {
        const totalHours = boothIds.reduce(
            (sum, boothId) => sum + (day[boothId] || 0),
            0
        )

        return {
            day: day.day,
            totalHours,
            avgHours: totalHours / boothCount,
        }
    })

    return (
        <Box mt={12}>
            <Heading size="md" mb={3}>
                Total & Average Usage per Day
            </Heading>

            <ResponsiveContainer width="100%" height={420}>
                <ComposedChart
                    data={mergedData}
                    margin={{ top: 20, right: 40, bottom: 0, left: 0 }}
                >
                    <CartesianGrid strokeDasharray="3 3" />

                    {/* X Axis = the day string */}
                    <XAxis dataKey="day" />

                    {/* LEFT Y axis → total hours */}
                    <YAxis
                        yAxisId="left"
                        label={{
                            value: "Total Hours",
                            angle: -90,
                            position: "insideLeft",
                        }}
                    />

                    {/* RIGHT Y axis → avg per booth */}
                    <YAxis
                        yAxisId="right"
                        orientation="right"
                        label={{
                            value: "Avg Hours/Booth",
                            angle: 90,
                            position: "insideRight",
                        }}
                    />

                    <Tooltip />
                    <Legend />

                    {/* Total hours = bar */}
                    <Bar
                        yAxisId="left"
                        dataKey="totalHours"
                        fill="#3182ce"
                        name="Total Hours"
                        barSize={30}
                    />

                    {/* Average hours = line */}
                    <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="avgHours"
                        stroke="#e53e3e"
                        strokeWidth={2}
                        name="Average Hours/Booth"
                        dot={false}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </Box>
    )
}
