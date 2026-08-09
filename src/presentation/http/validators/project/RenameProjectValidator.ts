import z from 'zod'

export const RenameProjectSchema = z.object({
  name: z.string().min(8).max(64),
})
