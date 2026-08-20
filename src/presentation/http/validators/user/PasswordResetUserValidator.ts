import z from 'zod'

export const RequestPasswordResetUserSchema = z.object({
  requestId: z.uuid(),
  email: z.email(),
})

export const ConfirmPasswordResetUserSchema = z.object({
  requestId: z.uuid(),
  code: z.number().int().min(10_000_000).max(99_999_999),
  newPassword: z.string().min(8),
})
