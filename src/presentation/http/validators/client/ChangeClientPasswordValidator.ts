import z from 'zod'

export const ChangeClientPasswordSchema = z.object({
  currentPassword: z.string().min(8).max(64),
  newPassword: z.string().min(8).max(64),
})
