import z from 'zod'

export const RenameApiKeySchema = z.object({
  name: z.string().min(1).max(64),
})
