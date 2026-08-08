import z from 'zod'

export const RenameApiKeySchema = z.object({
  name: z.string().min(8).max(64),
})
