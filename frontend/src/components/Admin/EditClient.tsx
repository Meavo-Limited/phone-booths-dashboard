import {
  Button,
  DialogTitle,
  Input,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { FaExchangeAlt } from "react-icons/fa"

import { ClientsService, type ClientRead } from "@/client"
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field } from "@/components/ui/field"
import useCustomToast from "@/hooks/useCustomToast"

export default function EditClient({ client }: { client: ClientRead }) {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()

  const { register, handleSubmit, formState } = useForm({
    defaultValues: { name: client.name },
  })

  const mutation = useMutation({
    mutationFn: (data: { name: string }) =>
      ClientsService.updateClient({ id: client.id, requestBody: data }),
    onSuccess: () => {
      showSuccessToast("Client updated successfully")
      queryClient.invalidateQueries({ queryKey: ["clients"] })
      setIsOpen(false)
    },
  })

  return (
    <DialogRoot open={isOpen} onOpenChange={({ open }) => setIsOpen(open)}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <FaExchangeAlt />
          Edit Client
        </Button>
      </DialogTrigger>

      <DialogContent>
        <form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
          </DialogHeader>

          <DialogBody>
            <Text mb={4}>Update client details.</Text>
            <VStack>
              <Field label="Client Name">
                <Input {...register("name", { required: true })} />
              </Field>
            </VStack>
          </DialogBody>

          <DialogFooter>
            <Button type="submit" loading={formState.isSubmitting}>
              Save
            </Button>
          </DialogFooter>

          <DialogCloseTrigger />
        </form>
      </DialogContent>
    </DialogRoot>
  )
}
