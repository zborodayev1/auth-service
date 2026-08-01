import z from 'zod'

export const ChangeClientNameSchema = z.object({
  name: z.string().min(3).max(64),
})
