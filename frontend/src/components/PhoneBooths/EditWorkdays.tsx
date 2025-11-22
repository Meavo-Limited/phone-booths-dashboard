import {
  Button,
  DialogActionTrigger,
  DialogTitle,
  Input,
  Text,
  VStack,
  HStack,
  Stack,
  For,
} from "@chakra-ui/react"
import { Checkbox } from "@chakra-ui/react" // NEW API
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { type SubmitHandler, useForm } from "react-hook-form"
import { FaPlus } from "react-icons/fa"

import { type PhoneBoothsBulkWorkdayUpdate, PhoneBoothsService } from "@/client"
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

const DAYS = [
  { label: "Mon", bit: 0 },
  { label: "Tue", bit: 1 },
  { label: "Wed", bit: 2 },
  { label: "Thu", bit: 3 },
  { label: "Fri", bit: 4 },
  { label: "Sat", bit: 5 },
  { label: "Sun", bit: 6 },
]

const EditWorkdays = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [mask, setMask] = useState(0)

  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()

  const { register, handleSubmit, reset } =
    useForm<PhoneBoothsBulkWorkdayUpdate>({
      mode: "onBlur",
      defaultValues: {
        workday_start: "",
        workday_end: "",
        working_days_mask: 0,
      },
    })

  const toggleBit = (bit: number) => {
    setMask((prev) => prev ^ (1 << bit))
  }

  const mutation = useMutation({
    mutationFn: (data: PhoneBoothsBulkWorkdayUpdate) =>
      PhoneBoothsService.bulkUpdateWorkdaySettings({ requestBody: data }),
    onSuccess: () => {
      showSuccessToast("Phone booth workdays updated successfully.")
      reset()
      setMask(0)
      setIsOpen(false)
    },
    onError: (err: ApiError) => handleError(err),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["phoneBooths"] }),
  })

  const onSubmit: SubmitHandler<PhoneBoothsBulkWorkdayUpdate> = (data) => {
    data.working_days_mask = mask
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
        <Button value="edit-workdays" my={4}>
          <FaPlus fontSize="16px" />
          Edit All Workdays
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Workday Settings (All Booths)</DialogTitle>
        </DialogHeader>

        <DialogBody>
          <VStack gap={4}>
            {/* Workday Start */}
            <Field label="Workday Start">
              <Input type="time" {...register("workday_start")} />
            </Field>

            {/* Workday End */}
            <Field label="Workday End">
              <Input type="time" {...register("workday_end")} />
            </Field>

            {/* Working Days Selector */}
            <Text alignSelf="flex-start" fontWeight="medium" mb={1}>
              Working Days
            </Text>
            <HStack wrap="wrap" gap={3}>
              <For each={DAYS}>
                {(day) => (
                  <Stack align="flex-start" flex="1" key={day.label}>
                    <Checkbox.Root
                      key={day.bit}
                      checked={Boolean(mask & (1 << day.bit))}
                      onCheckedChange={() => toggleBit(day.bit)}
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control />
                      <Checkbox.Label>{day.label}</Checkbox.Label>
                    </Checkbox.Root>
                  </Stack>
                )}
              </For>
            </HStack>

            <Text fontSize="sm" color="gray.500">
              Selected mask: {mask}
            </Text>
          </VStack>
        </DialogBody>

        <DialogFooter>
          <DialogActionTrigger asChild>
            <Button variant="outline">Cancel</Button>
          </DialogActionTrigger>

          <Button colorScheme="blue" onClick={handleSubmit(onSubmit)}>
            Save
          </Button>
        </DialogFooter>

        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
  )
}

export default EditWorkdays
