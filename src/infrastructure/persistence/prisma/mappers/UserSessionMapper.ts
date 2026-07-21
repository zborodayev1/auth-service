import { UserSession } from '@aggregates/userSession/UserSession'
import type { Prisma } from '@generated/prisma/client'

type PrismaUserSessionRow = Prisma.UserSessionGetPayload<Record<string, never>>

export function userSessionToDomain(raw: PrismaUserSessionRow): UserSession {
  return UserSession.reconstruct(
    raw.id,
    raw.userId,
    raw.expiresAt,
    raw.revokedAt,
    raw.createdAt,
    raw.lastUsedAt,
    raw.userAgent,
    raw.ipAddress,
    raw.deviceName,
  )
}
