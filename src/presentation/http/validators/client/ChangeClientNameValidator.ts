import z from 'zod'

export const ChangeClientNameSchema = z.object({
  name: z.string().min(8).max(64),
})
