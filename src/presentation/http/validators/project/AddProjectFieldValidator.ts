import z from 'zod'

export const AddProjectFieldSchema = z.object({
  name: z.string().min(2).max(64),
  type: z.enum(['string', 'number', 'boolean', 'date', 'enum']),
  required: z.boolean(),
  defaultValue: z.string().optional(),
  enumValues: z.array(z.string()),
})
