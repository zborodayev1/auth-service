import { ClientSession } from '@aggregates/clientSession/ClientSession'
import type { ClientSessionRepository } from '@aggregates/clientSession/ClientSessionRepository'
import { injectable } from 'inversify'
import { PrismaProvider } from '../PrismaProvider'
import { sessionToDomain } from '../mappers/SessionMapper'

@injectable()
export class PrismaSessionRepository implements ClientSessionRepository {
  constructor(private readonly prisma: PrismaProvider) {}

  async save(session: ClientSession): Promise<void> {
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

  async findById(id: string): Promise<ClientSession | null> {
    const raw = await this.prisma.session.findUnique({
      where: { id },
    })

    return raw ? sessionToDomain(raw) : null
  }

  async findByClientId(clientId: string): Promise<ClientSession[]> {
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
