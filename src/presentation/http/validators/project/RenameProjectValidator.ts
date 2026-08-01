import z from 'zod'

export const RenameProjectSchema = z.object({
  name: z.string().min(1).max(64),
})
