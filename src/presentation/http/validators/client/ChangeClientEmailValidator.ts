import z from 'zod'

export const ChangeClientEmailSchema = z.object({
  newEmail: z.email(),
  password: z.string().min(8),
})
