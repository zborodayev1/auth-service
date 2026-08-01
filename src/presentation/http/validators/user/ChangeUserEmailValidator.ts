import z from 'zod'

export const ChangeUserEmailSchema = z.object({
  newEmail: z.email(),
  password: z.string().min(8),
})
