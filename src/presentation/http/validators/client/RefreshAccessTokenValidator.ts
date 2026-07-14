import { z } from 'zod'

export const RefreshTokenCookiesSchema = z.object({
  refresh_token: z.string().min(1),
})

export type RefreshTokenCookies = z.infer<typeof RefreshTokenCookiesSchema>
