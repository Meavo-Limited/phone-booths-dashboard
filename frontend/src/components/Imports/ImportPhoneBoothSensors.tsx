import {
  Button,
  Card,
  Flex,
  Input,
  Text,
  VStack,
  Box,
  Table,
} from "@chakra-ui/react"
import { useMutation } from "@tanstack/react-query"
import { useState, useRef } from "react"
import { FaUpload, FaDownload } from "react-icons/fa"
import { ImportsService, type ImportResult } from "@/client"
import type { ApiError } from "@/client/core/ApiError"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"
import { Field } from "@/components/ui/field"

const ImportPhoneBoothsSensors = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const mutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData()
      formData.append("file", file)
      return ImportsService.importPhoneBoothsCsv({
        formData: { file },
      })
    },
    onSuccess: (data) => {
      setImportResult(data)
      if (data.created > 0) {
        showSuccessToast(
          `Successfully imported ${data.created} phone booth(s) and sensor(s)`
        )
      }
      if (data.errors.length > 0) {
        showErrorToast(`${data.errors.length} row(s) failed to import`)
      }
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    },
    onError: (err: ApiError) => {
      handleError(err)
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    },
  })

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (!file.name.endsWith(".csv")) {
        showErrorToast("Please select a CSV file")
        return
      }
      setSelectedFile(file)
      setImportResult(null)
    }
  }

  const handleImport = () => {
    if (selectedFile) {
      mutation.mutate(selectedFile)
    }
  }

  const handleDownloadTemplate = () => {
    const csvContent = `client_name,booth_name,booth_serial_num,org_unit_name,sensor_serial_num,timezone
ExampleClient,Booth 1,BOOTH001,Engineering,SENSOR001,Europe/Sofia
ExampleClient,Booth 2,BOOTH002,Marketing,SENSOR002,Europe/Sofia`

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "phone_booths_sensors_template.csv"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  return (
    <VStack gap={6} align="stretch">
      <Card.Root>
        <Card.Header>
          <Card.Title>Import Phone Booths and Sensors</Card.Title>
          <Card.Description>
            Upload a CSV file to import multiple phone booths and their sensors
          </Card.Description>
        </Card.Header>
        <Card.Body>
          <VStack gap={4} align="stretch">
            <Field label="CSV File">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
              />
            </Field>

            {selectedFile && (
              <Text fontSize="sm" color="gray.600">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
              </Text>
            )}

            <Flex gap={2}>
              <Button
                onClick={handleImport}
                disabled={!selectedFile}
                loading={mutation.isPending}
                colorPalette="blue"
              >
                <FaUpload fontSize="16px" />
                Import CSV
              </Button>

              <Button
                onClick={handleDownloadTemplate}
                variant="outline"
                colorPalette="gray"
              >
                <FaDownload fontSize="16px" />
                Download Template
              </Button>
            </Flex>

            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                CSV Format Requirements:
              </Text>
              <Text fontSize="sm" color="gray.600">
                • Required columns: client_name, booth_name, booth_serial_num,
                org_unit_name, sensor_serial_num, timezone
              </Text>
              <Text fontSize="sm" color="gray.600">
                • All rows must belong to the same client
              </Text>
              <Text fontSize="sm" color="gray.600">
                • Serial numbers must be unique
              </Text>
              <Text fontSize="sm" color="gray.600">
                • Organization units must exist in the system
              </Text>
              <Text fontSize="sm" color="gray.600">
                • Timezone must be a valid IANA timezone (e.g. Europe/Sofia)
              </Text>
            </Box>
          </VStack>
        </Card.Body>
      </Card.Root>

      {importResult && (
        <Card.Root>
          <Card.Header>
            <Card.Title>Import Results</Card.Title>
          </Card.Header>
          <Card.Body>
            <VStack gap={4} align="stretch">
              <Flex gap={4}>
                <Box>
                  <Text fontSize="sm" color="gray.600">
                    Total Rows
                  </Text>
                  <Text fontSize="2xl" fontWeight="bold">
                    {importResult.total_rows}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="green.600">
                    Created
                  </Text>
                  <Text fontSize="2xl" fontWeight="bold" color="green.600">
                    {importResult.created}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="red.600">
                    Failed
                  </Text>
                  <Text fontSize="2xl" fontWeight="bold" color="red.600">
                    {importResult.skipped}
                  </Text>
                </Box>
              </Flex>

              {importResult.errors.length > 0 && (
                <Box>
                  <Text fontSize="md" fontWeight="medium" mb={2}>
                    Errors:
                  </Text>
                  <Table.Root size="sm">
                    <Table.Header>
                      <Table.Row>
                        <Table.ColumnHeader>Row</Table.ColumnHeader>
                        <Table.ColumnHeader>Reason</Table.ColumnHeader>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {importResult.errors.map((error, index) => (
                        <Table.Row key={index}>
                          <Table.Cell>{error.row}</Table.Cell>
                          <Table.Cell>{error.reason}</Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                </Box>
              )}
            </VStack>
          </Card.Body>
        </Card.Root>
      )}
    </VStack>
  )
}

export default ImportPhoneBoothsSensors
