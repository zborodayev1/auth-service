import { Session } from '@aggregates/session/Session'
import type { Prisma } from '@generated/prisma/client'

type PrismaSessionRow = Prisma.SessionGetPayload<Record<string, never>>

export function sessionToDomain(raw: PrismaSessionRow): Session {
  return Session.reconstruct(
    raw.id,
    raw.clientId,
    raw.expiresAt,
    raw.revokedAt,
    raw.createdAt,
    raw.lastUsedAt,
    raw.userAgent,
    raw.ipAddress,
    raw.deviceName,
  )
}
