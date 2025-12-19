import {
  Button,
  createListCollection,
  DialogActionTrigger,
  DialogRoot,
  DialogTrigger,
  Flex,
  Input,
  Select,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { Controller, type SubmitHandler, useForm } from "react-hook-form"
import { FaExchangeAlt } from "react-icons/fa"

import {
  ClientsService,
  OrgUnitsService,
  OrgUnitTypesService,
  type OrgUnitRead,
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
  DialogTitle,
} from "../ui/dialog"
import { Field } from "../ui/field"

function getClientsQuery() {
  return {
    queryKey: ["clients"],
    queryFn: () => ClientsService.readClients(),
  }
}

function getOrgUnitsQuery() {
  return {
    queryKey: ["orgUnits"],
    queryFn: () => OrgUnitsService.readOrgUnits(),
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
  excludeId,
}: {
  collection: any
  value?: string[]
  onChange?: (value: string[]) => void
  excludeId?: string
}) {
  // Filter out the current org unit to prevent self-parenting
  const filteredItems = collection.items.filter(
    (item: any) => item.value !== excludeId
  )

  const filteredCollection = createListCollection({
    items: filteredItems,
  })

  return (
    <Select.Root
      collection={filteredCollection}
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
          {filteredCollection.items.map((unit: any) => (
            <Select.Item item={unit} key={unit.value}>
              {unit.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Positioner>
    </Select.Root>
  )
}

interface EditOrgUnitProps {
  orgUnit: OrgUnitRead
}

const EditOrgUnit = ({ orgUnit }: EditOrgUnitProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OrgUnitCreate>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      name: orgUnit.name,
      type_id: orgUnit.type_id,
      timezone: orgUnit.timezone,
      client_id: orgUnit.client_id,
      parent_id: orgUnit.parent_id,
    },
  })

  const clientsQuery = useQuery(getClientsQuery())
  const clientsCollection = createListCollection({
    items:
      clientsQuery.data?.map((client) => ({
        label: client.name,
        value: client.id,
      })) ?? [],
  })

  const orgUnitsQuery = useQuery(getOrgUnitsQuery())
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
      OrgUnitsService.updateOrgUnit({ id: orgUnit.id, requestBody: data }),
    onSuccess: () => {
      showSuccessToast("Organization unit updated successfully.")
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

  const onSubmit: SubmitHandler<OrgUnitCreate> = async (data) => {
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
        <Button variant="ghost" size="sm">
          <FaExchangeAlt fontSize="16px" />
          Edit Organization Unit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Edit Organization Unit</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Text mb={4}>Update the organization unit details below.</Text>
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
                      excludeId={orgUnit.id}
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
            <Button variant="solid" type="submit" loading={isSubmitting}>
              Save
            </Button>
          </DialogFooter>
          <DialogCloseTrigger />
        </form>
      </DialogContent>
    </DialogRoot>
  )
}

export default EditOrgUnit
