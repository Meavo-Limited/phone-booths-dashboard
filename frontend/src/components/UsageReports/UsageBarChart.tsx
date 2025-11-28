import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts"
import { Box, Heading } from "@chakra-ui/react"

const COLORS = [
  "#3182ce", "#38a169", "#d69e2e", "#dd6b20",
  "#805ad5", "#e53e3e", "#319795", "#718096",
]

interface BoothInfo {
  name: string
  workingHours: number
}

interface Props {
  data: any[]
  boothMap: Record<string, BoothInfo>
}

export function UsageBarChart({ data, boothMap }: Props) {
  // List of booth IDs from the map
  const boothKeys = Object.keys(boothMap)


  const formatDayOfWeek = (isoDate: string) => {
    const date = new Date(isoDate)
    return date.toLocaleDateString(undefined, { weekday: "long" })
  }

  return (
    <Box mt={12}>
      <Heading size="md" mb={3}>
        Daily Busy Hours per Booth
      </Heading>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="day" />
          <YAxis />

          <Tooltip
            formatter={(value, name) => [
              `${value} h`,
              boothMap[name]?.name || name,
            ]}
            labelFormatter={(day) => {
              const weekday = formatDayOfWeek(day)
              return `${day} (${weekday})`
            }}
          />

          <Legend />

          {boothKeys.map((boothId, index) => (
            <Bar
              key={boothId}
              dataKey={boothId}
              stackId="a"
              fill={COLORS[index % COLORS.length]}
              name={boothMap[boothId]?.name || `Booth ${boothId.slice(0, 6)}`}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Box>
  )
}
