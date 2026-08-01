import z from 'zod'

export const UpdateProjectUserFieldBodySchema = z.object({
  value: z.string(),
})

export const UpdateProjectUserFieldParamSchema = z.object({
  userId: z.uuid(),
  name: z.string().min(1),
})
