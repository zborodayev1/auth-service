import z from 'zod'

export const RegisterUserSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  fields: z.record(z.string(), z.unknown()),
  deviceName: z.string().optional(),
})
