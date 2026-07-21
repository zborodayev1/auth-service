import { UserRefreshToken } from '@aggregates/userRefreshToken/UserRefreshToken'
import type { Prisma } from '@generated/prisma/client'

type PrismaUserRefreshTokenRow = Prisma.UserRefreshTokenGetPayload<Record<string, never>>

export function userRefreshTokenToDomain(raw: PrismaUserRefreshTokenRow): UserRefreshToken {
  return UserRefreshToken.reconstruct(
    raw.id,
    raw.sessionId,
    raw.hash,
    raw.usedAt,
    raw.revokedAt,
    raw.expiresAt,
    raw.createdAt,
  )
}
