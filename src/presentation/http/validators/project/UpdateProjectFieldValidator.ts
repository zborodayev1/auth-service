import z from 'zod'

export const UpdateProjectFieldSchema = z.object({
  name: z.string().max(64),
  required: z.boolean(),
  defaultValue: z.string().optional(),
  enumValues: z.array(z.string()),
})

export type UpdateProjectFieldDto = z.infer<typeof UpdateProjectFieldSchema>
