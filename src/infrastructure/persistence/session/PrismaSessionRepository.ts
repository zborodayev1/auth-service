import { Session } from '@aggregates/session/Session'
import type { SessionRepository } from '@aggregates/session/SessionRepository'
import { PrismaClient } from '@generated/prisma/client'
import { injectable } from 'inversify'
import { sessionToDomain } from './SessionMapper'

@injectable()
export class PrismaSessionRepository implements SessionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(session: Session): Promise<void> {
    await this.prisma.session.upsert({
      where: { id: session.id },
      update: {
        expiresAt: session.expiresAt,
        revokedAt: session.revokedAt,
        lastUsedAt: session.lastUsedAt,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        deviceName: session.deviceName,
      },
      create: {
        id: session.id,
        clientId: session.clientId,
        expiresAt: session.expiresAt,
        revokedAt: session.revokedAt,
        createdAt: session.createdAt,
        lastUsedAt: session.lastUsedAt,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        deviceName: session.deviceName,
      },
    })
  }

  async findById(id: string): Promise<Session | null> {
    const raw = await this.prisma.session.findUnique({
      where: { id },
    })

    return raw ? sessionToDomain(raw) : null
  }

  async findByClientId(clientId: string): Promise<Session[]> {
    const raws = await this.prisma.session.findMany({
      where: { clientId },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return raws.map(sessionToDomain)
  }

  async revokeAllByClientId(clientId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: {
        clientId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    })
  }

  async deleteExpired(): Promise<void> {
    await this.prisma.session.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    })
  }
}
