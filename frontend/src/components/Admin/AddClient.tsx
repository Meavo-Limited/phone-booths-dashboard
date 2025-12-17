import {
  Button,
  DialogActionTrigger,
  DialogTitle,
  Input,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { FaPlus } from "react-icons/fa"

import { ClientsService } from "@/client"
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

export default function AddClient() {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()

  const { register, handleSubmit, reset, formState } = useForm<{ name: string }>()

  const mutation = useMutation({
    mutationFn: (data: { name: string }) =>
      ClientsService.createClient({ requestBody: data }),
    onSuccess: () => {
      showSuccessToast("Client created successfully")
      queryClient.invalidateQueries({ queryKey: ["clients"] })
      reset()
      setIsOpen(false)
    },
  })

  return (
    <DialogRoot open={isOpen} onOpenChange={({ open }) => setIsOpen(open)}>
      <DialogTrigger asChild>
        <Button my={4}>
          <FaPlus />
          Add Client
        </Button>
      </DialogTrigger>

      <DialogContent>
        <form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
          <DialogHeader>
            <DialogTitle>Add Client</DialogTitle>
          </DialogHeader>

          <DialogBody>
            <Text mb={4}>Create a new client.</Text>
            <VStack>
              <Field label="Client Name" required>
                <Input {...register("name", { required: true })} />
              </Field>
            </VStack>
          </DialogBody>

          <DialogFooter>
            <DialogActionTrigger asChild>
              <Button variant="subtle">Cancel</Button>
            </DialogActionTrigger>
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
