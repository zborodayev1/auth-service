import z from 'zod'

export const RequestPasswordResetClientSchema = z.object({
  requestId: z.uuid(),
  email: z.email(),
})

export const ConfirmPasswordResetClientSchema = z.object({
  token: z.string().length(64),
  deviceName: z.string().optional(),
})
