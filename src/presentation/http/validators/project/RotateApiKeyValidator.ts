import z from 'zod'

export const RotateApiKeySchema = z.object({
  name: z.string().min(8).max(64).optional(),
})
