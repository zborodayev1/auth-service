import z from 'zod'

export const LoginUserSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  deviceName: z.string().optional(),
})
