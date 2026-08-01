import z from 'zod'

export const DeleteUserSelfSchema = z.object({
  password: z.string().min(8),
})
