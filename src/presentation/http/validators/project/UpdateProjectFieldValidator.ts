import z from 'zod'

export const UpdateProjectFieldSchema = z
  .object({
    name: z.string().max(64),
    required: z.boolean(),
    defaultValue: z.string().optional(),
    enumValues: z.array(z.string()),
  })
  .superRefine((data, ctx) => {
    if (data.enumValues.length === 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'Enum type requires at least one value',
        path: ['enumValues'],
      })
    }
  })

export type UpdateProjectFieldDto = z.infer<typeof UpdateProjectFieldSchema>
