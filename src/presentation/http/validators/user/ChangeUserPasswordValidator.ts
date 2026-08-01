import z from 'zod'

export const ChangeUserPasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8),
})
