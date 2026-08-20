import z from 'zod'

export const RequestChangeClientEmailSchema = z.object({
  newEmail: z.email(),
  password: z.string().min(8),
})

export const TokenSchema = z.object({
  token: z.string().length(64),
})
