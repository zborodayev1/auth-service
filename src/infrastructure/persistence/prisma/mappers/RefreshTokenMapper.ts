import { RefreshToken } from '@aggregates/refreshToken/RefreshToken'
import type { Prisma } from '@generated/prisma/client'

type PrismaSessionRow = Prisma.RefreshTokenGetPayload<Record<string, never>>

export function refreshToDomain(raw: PrismaSessionRow): RefreshToken {
  return RefreshToken.reconstruct(
    raw.id,
    raw.sessionId,
    raw.hash,
    raw.usedAt,
    raw.revokedAt,
    raw.expiresAt,
    raw.createdAt,
  )
}
