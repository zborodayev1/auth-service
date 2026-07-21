import { ClientRefreshToken } from '@aggregates/clientRefreshToken/RefreshToken'
import type { Prisma } from '@generated/prisma/client'

type PrismaSessionRow = Prisma.RefreshTokenGetPayload<Record<string, never>>

export function refreshToDomain(raw: PrismaSessionRow): ClientRefreshToken {
  return ClientRefreshToken.reconstruct(
    raw.id,
    raw.sessionId,
    raw.hash,
    raw.usedAt,
    raw.revokedAt,
    raw.expiresAt,
    raw.createdAt,
  )
}
