import {
  Button,
  createListCollection,
  DialogActionTrigger,
  DialogTitle,
  Input,
  Select,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState, useEffect } from "react"
import { Controller, type SubmitHandler, useForm } from "react-hook-form"
import { FaPlus } from "react-icons/fa"
import {
  ClientsService,
  OrgUnitsService,
  OrgUnitTypesService,
  type OrgUnitCreate,
} from "@/client"
import type { ApiError } from "@/client/core/ApiError"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTrigger,
} from "../ui/dialog"
import { Field } from "../ui/field"

function getClientsQuery() {
  return {
    queryKey: ["clients"],
    queryFn: () => ClientsService.readClients(),
  }
}

function getOrgUnitsByClientQuery({ clientId }: { clientId: string }) {
  return {
    queryFn: () => OrgUnitsService.readOrgUnitsByClient({ clientId }),
    queryKey: ["orgUnits", "byClient", clientId],
  }
}

function getOrgUnitTypesQuery() {
  return {
    queryKey: ["orgUnitTypes"],
    queryFn: () => OrgUnitTypesService.readOrgUnitTypes(),
  }
}

function ClientSelect({
  collection,
  value,
  onChange,
}: {
  collection: any
  value?: string[]
  onChange?: (value: string[]) => void
}) {
  return (
    <Select.Root
      collection={collection}
      size="sm"
      value={value}
      onValueChange={(details) => onChange?.(details.value)}
    >
      <Select.HiddenSelect />
      <Select.Label>Select client</Select.Label>
      <Select.Control>
        <Select.Trigger>
          <Select.ValueText placeholder="Select client" />
        </Select.Trigger>
        <Select.IndicatorGroup>
          <Select.Indicator />
        </Select.IndicatorGroup>
      </Select.Control>
      <Select.Positioner>
        <Select.Content>
          {collection.items.map((client: any) => (
            <Select.Item item={client} key={client.value}>
              {client.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Positioner>
    </Select.Root>
  )
}

function OrgUnitTypeSelect({
  collection,
  value,
  onChange,
}: {
  collection: any
  value?: string[]
  onChange?: (value: string[]) => void
}) {
  return (
    <Select.Root
      collection={collection}
      size="sm"
      value={value}
      onValueChange={(details) => onChange?.(details.value)}
    >
      <Select.HiddenSelect />
      <Select.Label>Select type</Select.Label>
      <Select.Control>
        <Select.Trigger>
          <Select.ValueText placeholder="Select type" />
        </Select.Trigger>
        <Select.IndicatorGroup>
          <Select.Indicator />
        </Select.IndicatorGroup>
      </Select.Control>
      <Select.Positioner>
        <Select.Content>
          {collection.items.map((type: any) => (
            <Select.Item item={type} key={type.value}>
              {type.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Positioner>
    </Select.Root>
  )
}

function ParentOrgUnitSelect({
  collection,
  value,
  onChange,
}: {
  collection: any
  value?: string[]
  onChange?: (value: string[]) => void
}) {
  return (
    <Select.Root
      collection={collection}
      size="sm"
      value={value}
      onValueChange={(details) => onChange?.(details.value)}
    >
      <Select.HiddenSelect />
      <Select.Label>Select parent (optional)</Select.Label>
      <Select.Control>
        <Select.Trigger>
          <Select.ValueText placeholder="Select parent org unit" />
        </Select.Trigger>
        <Select.IndicatorGroup>
          <Select.Indicator />
        </Select.IndicatorGroup>
      </Select.Control>
      <Select.Positioner>
        <Select.Content>
          {collection.items.map((unit: any) => (
            <Select.Item item={unit} key={unit.value}>
              {unit.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Positioner>
    </Select.Root>
  )
}

const AddOrgUnit = ({ selectedClient }: { selectedClient: string | null }) => {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isValid, isSubmitting },
  } = useForm<OrgUnitCreate>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      name: "",
      type_id: null,
      timezone: "",
      client_id: selectedClient || "",
      parent_id: null,
    },
  })

  // Watch the client_id field to filter parent org units
  const watchedClientId = watch("client_id")

  // Update client_id when selectedClient changes
  useEffect(() => {
    if (selectedClient) {
      setValue("client_id", selectedClient)
    }
  }, [selectedClient, setValue])

  // Reset parent_id when client changes
  useEffect(() => {
    setValue("parent_id", null)
  }, [watchedClientId, setValue])

  const clientsQuery = useQuery(getClientsQuery())
  const clientsCollection = createListCollection({
    items:
      clientsQuery.data?.map((client) => ({
        label: client.name,
        value: client.id,
      })) ?? [],
  })

  // Fetch org units for the selected client only
  const orgUnitsQuery = useQuery({
    ...getOrgUnitsByClientQuery({ clientId: watchedClientId as string }),
    enabled: !!watchedClientId, // Only fetch when client is selected
  })
  
  const orgUnitsCollection = createListCollection({
    items:
      orgUnitsQuery.data?.map((unit) => ({
        label: unit.name,
        value: unit.id,
      })) ?? [],
  })

  const orgUnitTypesQuery = useQuery(getOrgUnitTypesQuery())
  const orgUnitTypesCollection = createListCollection({
    items:
      orgUnitTypesQuery.data?.map((type) => ({
        label: type.name,
        value: String(type.id),
      })) ?? [],
  })

  const mutation = useMutation({
    mutationFn: (data: OrgUnitCreate) =>
      OrgUnitsService.createOrgUnit({ requestBody: data }),
    onSuccess: () => {
      showSuccessToast("Organization unit created successfully.")
      reset()
      setIsOpen(false)
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["orgUnits"] })
    },
  })

  const onSubmit: SubmitHandler<OrgUnitCreate> = (data) => {
    mutation.mutate(data)
  }

  return (
    <DialogRoot
      size={{ base: "xs", md: "md" }}
      placement="center"
      open={isOpen}
      onOpenChange={({ open }) => setIsOpen(open)}
    >
      <DialogTrigger asChild>
        <Button value="add-org-unit" my={4}>
          <FaPlus fontSize="16px" />
          Add Organization Unit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Add Organization Unit</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Text mb={4}>
              Fill in the form below to add a new organization unit to the system.
            </Text>
            <VStack gap={4}>
              <Field
                required
                invalid={!!errors.name}
                errorText={errors.name?.message}
                label="Name"
              >
                <Input
                  {...register("name", {
                    required: "Name is required",
                  })}
                  placeholder="Organization unit name"
                  type="text"
                />
              </Field>

              <Field
                required
                invalid={!!errors.client_id}
                errorText={errors.client_id?.message}
                label="Client"
              >
                <Controller
                  control={control}
                  name="client_id"
                  rules={{ required: "Client is required" }}
                  render={({ field }) => (
                    <ClientSelect
                      collection={clientsCollection}
                      value={field.value ? [field.value] : []}
                      onChange={(values) => field.onChange(values[0] || "")}
                    />
                  )}
                />
              </Field>

              <Field label="Type">
                <Controller
                  control={control}
                  name="type_id"
                  render={({ field }) => (
                    <OrgUnitTypeSelect
                      collection={orgUnitTypesCollection}
                      value={field.value !== null ? [String(field.value)] : []}
                      onChange={(values) =>
                        field.onChange(values[0] ? Number(values[0]) : null)
                      }
                    />
                  )}
                />
              </Field>

              <Field label="Parent Organization Unit">
                <Controller
                  control={control}
                  name="parent_id"
                  render={({ field }) => (
                    <ParentOrgUnitSelect
                      collection={orgUnitsCollection}
                      value={field.value ? [field.value] : []}
                      onChange={(values) => field.onChange(values[0] || null)}
                    />
                  )}
                />
              </Field>

              <Field
                invalid={!!errors.timezone}
                errorText={errors.timezone?.message}
                label="Timezone"
              >
                <Input
                  {...register("timezone")}
                  placeholder="e.g., Europe/London"
                  type="text"
                />
              </Field>
            </VStack>
          </DialogBody>

          <DialogFooter gap={2}>
            <DialogActionTrigger asChild>
              <Button
                variant="subtle"
                colorPalette="gray"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </DialogActionTrigger>
            <Button
              variant="solid"
              type="submit"
              disabled={!isValid}
              loading={isSubmitting}
            >
              Save
            </Button>
          </DialogFooter>
        </form>
        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
  )
}

export default AddOrgUnit
