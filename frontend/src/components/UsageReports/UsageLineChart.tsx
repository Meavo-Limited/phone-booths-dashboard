import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts"
import { Box, Heading } from "@chakra-ui/react"

interface Props {
  data: any[]
}

export function UsageLineChart({ data }: Props) {
  return (
    <Box mt={12}>
      <Heading size="md" mb={3}>
        Total Daily Busy Hours (All Selected Booths)
      </Heading>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="day" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="total_hours"
            stroke="#3182ce"
            strokeWidth={2}
            dot={{ r: 3 }}
            name="Total Hours"
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  )
}
