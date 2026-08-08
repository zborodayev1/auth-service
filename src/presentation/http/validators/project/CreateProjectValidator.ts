import z from 'zod'

export const CreateProjectSchema = z.object({
  name: z.string().min(8).max(64),
})
