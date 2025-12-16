import {
  Box,
  Container,
  Text,
  SimpleGrid,
  Icon,
  Heading,
  Stat,
  Spinner,
} from "@chakra-ui/react"
import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useState } from "react"

import { FaDoorClosed, FaHeadset, FaPercentage, FaClock } from "react-icons/fa"
import useAuth from "@/hooks/useAuth"
import { DashboardService, DashboardStatsResponse } from "@/client"

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
})

function Dashboard() {
  const { user: currentUser } = useAuth()

  const [stats, setStats] = useState<DashboardStatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
  async function fetchStats() {
    try {
      setLoading(true)

      const end = new Date()
      const start = new Date()
      start.setDate(end.getDate() - 7)

      const startDate = start.toISOString().slice(0, 10) // YYYY-MM-DD
      const endDate = end.toISOString().slice(0, 10)

      const res = await DashboardService.dashboardStats({
        startDate,
        endDate,
      })

      setStats(res)
    } catch (err: any) {
      console.error("Failed to load dashboard stats", err)
      setError(err?.message || "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  fetchStats()
}, [])

  if (loading)
    return (
      <Container maxW="full" py={12}>
        <Spinner size="xl" />
      </Container>
    )

  if (error)
    return (
      <Container maxW="full" py={12}>
        <Text color="red.500">Error loading dashboard stats: {error}</Text>
      </Container>
    )

  if (!stats)
    return (
      <Container maxW="full" py={12}>
        <Text>No stats available</Text>
      </Container>
    )

  const { total_booths, booths_in_use, usage_rate, time_at_max_capacity } = stats

  return (
    <Container maxW="full" py={12}>
      {/* Greeting */}
      <Box px={4} mb={10}>
        <Heading size="lg" mb={1}>
          Hi, {currentUser?.full_name || currentUser?.email} 👋🏼
        </Heading>
        <Text color="gray.600">Welcome back, nice to see you again!</Text>
      </Box>

      {/* Stats Grid */}
      <SimpleGrid columns={[1, 2, 2, 4]} gap={6} px={4}>
        <DashboardStat
          icon={FaDoorClosed}
          label="Total Booths"
          value={total_booths.toString()}
          color="blue.500"
        />

        <DashboardStat
          icon={FaHeadset}
          label="Booths in Use"
          value={`${booths_in_use}/${total_booths}`}
          color="green.500"
          helper={`${Math.round((booths_in_use / total_booths) * 100)}% active`}
        />

        <DashboardStat
          icon={FaPercentage}
          label="Usage Rate"
          value={`${usage_rate.toFixed(2)}%`}
          color="purple.500"
          helper="Last 7 days"
        />

        <DashboardStat
          icon={FaClock}
          label="Time at Max Capacity"
          value={time_at_max_capacity}
          color="orange.500"
          helper="Last 7 days"
        />
      </SimpleGrid>
    </Container>
  )
}

/* ------------------------------ */
/*     Reusable Dashboard Stat    */
/* ------------------------------ */

function DashboardStat({
  icon,
  label,
  value,
  helper,
  color,
}: {
  icon: any
  label: string
  value: string
  helper?: string
  color: string
}) {
  return (
    <Stat.Root
      p={6}
      borderRadius="2xl"
      boxShadow="sm"
      bg="white"
      _dark={{ bg: "gray.800" }}
    >
      {/* Icon + Label */}
      <Box display="flex" alignItems="center" mb={3}>
        <Icon as={icon} boxSize={6} color={color} mr={3} />
        <Stat.Label fontWeight="bold">{label}</Stat.Label>
      </Box>

      {/* Value */}
      <Stat.ValueText fontSize="3xl" fontWeight="semibold">
        {value}
      </Stat.ValueText>

      {/* Helper text */}
      {helper && (
        <Stat.HelpText color="gray.500" mt={1}>
          {helper}
        </Stat.HelpText>
      )}
    </Stat.Root>
  )
}
