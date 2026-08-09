import z from 'zod'

export const UpdateUserFieldBodySchema = z.object({
  value: z.union([z.string(), z.number(), z.boolean()]),
})

export const UpdateUserFieldParamSchema = z.object({ id: z.uuid() })
