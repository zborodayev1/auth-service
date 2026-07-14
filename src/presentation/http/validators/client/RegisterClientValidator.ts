import { z } from 'zod'

export const RegisterClientSchema = z.object({
  name: z.string().min(8),
  email: z.email(),
  password: z.string().min(8),
  deviceName: z.string().optional(),
})
