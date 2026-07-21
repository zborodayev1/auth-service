import { injectable } from 'inversify'
import { UserSession } from '@aggregates/userSession/UserSession'
import type { UserSessionRepository } from '@aggregates/userSession/UserSessionRepository'
import { PrismaProvider } from '../PrismaProvider'
import { userSessionToDomain } from '../mappers/UserSessionMapper'

@injectable()
export class PrismaUserSessionRepository implements UserSessionRepository {
  constructor(private readonly prisma: PrismaProvider) {}

  async save(session: UserSession): Promise<void> {
    await this.prisma.userSession.upsert({
      where: { id: session.id },
      create: {
        id: session.id,
        userId: session.userId,
        expiresAt: session.expiresAt,
        revokedAt: session.revokedAt,
        createdAt: session.createdAt,
        lastUsedAt: session.lastUsedAt,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        deviceName: session.deviceName,
      },
      update: {
        expiresAt: session.expiresAt,
        revokedAt: session.revokedAt,
        lastUsedAt: session.lastUsedAt,
      },
    })
  }

  async findById(id: string): Promise<UserSession | null> {
    const raw = await this.prisma.userSession.findUnique({ where: { id } })
    return raw ? userSessionToDomain(raw) : null
  }

  async findByUserId(userId: string): Promise<UserSession[]> {
    const raws = await this.prisma.userSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
    return raws.map(userSessionToDomain)
  }

  async revokeAllByUserId(userId: string): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }

  async deleteExpired(): Promise<void> {
    await this.prisma.userSession.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    })
  }
}
