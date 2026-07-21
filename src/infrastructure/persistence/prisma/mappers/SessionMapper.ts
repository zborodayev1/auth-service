import { ClientSession } from '@aggregates/clientSession/ClientSession'
import type { Prisma } from '@generated/prisma/client'

type PrismaSessionRow = Prisma.SessionGetPayload<Record<string, never>>

export function sessionToDomain(raw: PrismaSessionRow): ClientSession {
  return ClientSession.reconstruct(
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
