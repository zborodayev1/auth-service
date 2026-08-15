import { ClientSession } from '@aggregates/clientSession/ClientSession'
import type { ClientSessionRepository } from '@aggregates/clientSession/ClientSessionRepository'
import { injectable, inject } from 'inversify'
import { sessionToDomain } from '../mappers/SessionMapper'
import { TransactionContext } from '../TransactionContext'
import { PrismaRepository } from '../PrismaRepository'

@injectable()
export class PrismaClientSessionRepository
  extends PrismaRepository
  implements ClientSessionRepository
{
  constructor(@inject(TransactionContext) ctx: TransactionContext) {
    super(ctx)
  }

  async save(session: ClientSession): Promise<void> {
    await this.prismaClient.session.upsert({
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
    const raw = await this.prismaClient.session.findUnique({
      where: { id },
    })

    return raw ? sessionToDomain(raw) : null
  }

  async findAllActiveByClientId(clientId: string): Promise<ClientSession[]> {
    const raws = await this.prismaClient.session.findMany({
      where: {
        clientId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return raws.map(sessionToDomain)
  }

  async findByIdAndClientId(id: string, clientId: string): Promise<ClientSession | null> {
    const raw = await this.prismaClient.session.findFirst({
      where: { id, clientId },
    })
    return raw ? sessionToDomain(raw) : null
  }

  async revokeAllByClientId(clientId: string): Promise<void> {
    await this.prismaClient.session.updateMany({
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
    await this.prismaClient.session.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { not: null } }],
      },
    })
  }
}
