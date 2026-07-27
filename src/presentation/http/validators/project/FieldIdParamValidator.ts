import z from 'zod'

export const FieldIdParamSchema = z.object({
  fieldId: z.uuid(),
})
