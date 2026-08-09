import z from 'zod'

export const AddProjectFieldSchema = z
  .object({
    name: z.string().max(64),
    type: z.enum(['string', 'number', 'boolean', 'date', 'enum']),
    required: z.boolean(),
    defaultValue: z.string().optional(),
    enumValues: z.array(z.string()),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'enum' && data.enumValues.length === 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'Enum type requires at least one value',
        path: ['enumValues'],
      })
    }

    if (data.defaultValue !== undefined) {
      if (data.type === 'number' && isNaN(Number(data.defaultValue))) {
        ctx.addIssue({
          code: 'custom',
          message: 'defaultValue must be a valid number',
          path: ['defaultValue'],
        })
      }
      if (data.type === 'date' && isNaN(new Date(data.defaultValue).getTime())) {
        ctx.addIssue({
          code: 'custom',
          message: 'defaultValue must be a valid date',
          path: ['defaultValue'],
        })
      }
      if (data.type === 'enum' && !data.enumValues.includes(data.defaultValue)) {
        ctx.addIssue({
          code: 'custom',
          message: 'defaultValue must be one of enumValues',
          path: ['defaultValue'],
        })
      }
      if (
        data.type === 'boolean' &&
        data.defaultValue !== 'true' &&
        data.defaultValue !== 'false'
      ) {
        ctx.addIssue({
          code: 'custom',
          message: 'defaultValue must be "true" or "false"',
          path: ['defaultValue'],
        })
      }
    }
  })
