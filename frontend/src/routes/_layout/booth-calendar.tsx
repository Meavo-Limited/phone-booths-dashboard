import { Container, Heading, Spinner, Text } from "@chakra-ui/react"
import { createFileRoute } from "@tanstack/react-router"
import { PhoneBoothsService } from "@/client"
import { useQuery } from "@tanstack/react-query"
import { useState, useMemo } from "react"
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import timeGridPlugin from '@fullcalendar/timegrid'
import PhoneBoothTreeFilter from "@/components/Common/PhoneBoothFilterTree"

const EVENT_COLORS = [
  "#3182ce", // Blue
  "#38a169", // Green
  "#d69e2e", // Yellow
  "#dd6b20", // Orange
  "#805ad5", // Purple
  "#e53e3e", // Red
  "#319795", // Teal
  "#718096", // Gray
  "#2c7a7b", // Dark Teal
  "#2d3748", // Dark Gray
  "#c53030", // Dark Red
  "#9f7aea", // Light Purple
  "#ed8936", // Light Orange
  "#48bb78", // Light Green
  "#4299e1", // Light Blue
  "#ed64a6", // Pink
  "#667eea", // Indigo
  "#f687b3", // Light Pink
  "#fc8181", // Light Red
  "#68d391", // Mint Green
  "#4fd1c5", // Cyan
  "#63b3ed", // Sky Blue
  "#f6ad55", // Peach
  "#d6bcfa", // Lavender
]

function getBusyPhoneBoothsQuery() {
  return {
    queryKey: ["busyPhoneBooths"],
    queryFn: () => PhoneBoothsService.readBusyPhoneBooths({ skip: 0, limit: 100 }),
    refetchInterval: 10000,
  }
}

export const Route = createFileRoute("/_layout/booth-calendar")({
  component: BoothCalendar,
})

// ---------------- CALENDAR COMPONENT ----------------

function CalendarView({ booths }: { booths: any[] }) {
  const now = new Date().toISOString()

  // Color mapping based on booth ID hash
  // const getColorForBooth = (boothId: string) => {
  //   let hash = 0
  //   for (let i = 0; i < boothId.length; i++) {
  //     hash = boothId.charCodeAt(i) + ((hash << 5) - hash)
  //   }
  //   return EVENT_COLORS[Math.abs(hash) % EVENT_COLORS.length]
  // }

  // Create a stable color mapping based on booth order
  const boothColorMap = useMemo(() => {
    const map = new Map<string, string>()
    booths.forEach((booth, index) => {
      map.set(booth.id, EVENT_COLORS[index % EVENT_COLORS.length])
    })
    return map
  }, [booths])

  const getColorForBooth = (boothId: string) => {
    return boothColorMap.get(boothId) || EVENT_COLORS[0]
  }

  const events = booths.map((booth: any) => ({
    id: booth.id,
    title: booth.name || 'Unknown Booth',
    start: booth.updated_at,
    end: now,
    color: getColorForBooth(booth.id),
  }))

  return (
    <div style={{ marginTop: '40px' }}>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        initialView='timeGridDay'
        events={events}
        eventDisplay="block"
        height="auto"
      />
    </div>
  )
}

// ---------------- MAIN COMPONENT ----------------

function BoothCalendar() {
  const [checkedItems, setCheckedItems] = useState<string[]>([])

  const { data: allBooths, isLoading, isError, error } = useQuery(getBusyPhoneBoothsQuery())

  const filteredBooths = useMemo(() => {
    if (!allBooths) return []
    if (checkedItems.length === 0) return allBooths // nothing checked = show all

    // filter: only booths whose ID is in checkedItems
    return allBooths.filter((booth: any) => checkedItems.includes(booth.id))
  }, [allBooths, checkedItems])

  if (isLoading) {
    return (
      <Container maxW="full" pt={12} textAlign="center">
        <Spinner />
      </Container>
    )
  }

  if (isError) {
    return (
      <Container maxW="full" pt={12} textAlign="center">
        <Text color="red.500">Error: {error.message}</Text>
      </Container>
    )
  }

  return (
    <Container maxW="full" pt={12}>
      <Heading size="lg" mb={4}>
        Busy Phone Booths
      </Heading>

      <PhoneBoothTreeFilter onCheckedChange={setCheckedItems} />

      <CalendarView booths={filteredBooths} />
    </Container>
  )
}

export default BoothCalendar
