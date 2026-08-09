import z from 'zod'

export const DeleteProjectFieldQuerySchema = z.object({
  force: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
})
