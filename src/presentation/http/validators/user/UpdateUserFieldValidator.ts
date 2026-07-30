import z from 'zod'

export const UpdateUserFieldBodySchema = z.object({
  value: z.union([z.string(), z.number(), z.boolean()]),
})

export const UpdateUserFieldParamSchema = z.object({ name: z.string().min(1) })
