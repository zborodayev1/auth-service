import { ClientSession } from '@aggregates/clientSession/ClientSession'
import type { Prisma } from '@generated/prisma/client'

type PrismaSessionRow = Prisma.SessionGetPayload<Record<string, never>>

export function sessionToDomain(raw: PrismaSessionRow): ClientSession {
  return ClientSession.reconstruct({
    id: raw.id,
    clientId: raw.clientId,
    expiresAt: raw.expiresAt,
    revokedAt: raw.revokedAt,
    createdAt: raw.createdAt,
    lastUsedAt: raw.lastUsedAt,
    userAgent: raw.userAgent,
    ipAddress: raw.ipAddress,
    deviceName: raw.deviceName,
  })
}
