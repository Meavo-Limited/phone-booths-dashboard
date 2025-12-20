import ImportPhoneBoothsSensors from "@/components/Imports/ImportPhoneBoothSensors"
import { Container, Heading } from "@chakra-ui/react"
import { createFileRoute } from "@tanstack/react-router"
export const Route = createFileRoute("/_layout/admin/import-from-csv")({
  component: Imports,
})

function Imports() {
  return (
    <Container maxW="full">
      <Heading size="lg" pt={12} mb={6}>
        Data Import
      </Heading>

      <ImportPhoneBoothsSensors />
    </Container>
  )
}
