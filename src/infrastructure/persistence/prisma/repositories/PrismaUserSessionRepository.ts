import { injectable, inject } from 'inversify'
import { UserSession } from '@aggregates/userSession/UserSession'
import type { UserSessionRepository } from '@aggregates/userSession/UserSessionRepository'
import { userSessionToDomain } from '../mappers/UserSessionMapper'
import { TransactionContext } from '../TransactionContext'
import { PrismaRepository } from '../PrismaRepository'

@injectable()
export class PrismaUserSessionRepository extends PrismaRepository implements UserSessionRepository {
  constructor(@inject(TransactionContext) ctx: TransactionContext) {
    super(ctx)
  }

  async save(session: UserSession): Promise<void> {
    await this.prismaClient.userSession.upsert({
      where: { id: session.id },
      create: {
        id: session.id,
        userId: session.userId,
        projectId: session.projectId,
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
    const raw = await this.prismaClient.userSession.findUnique({ where: { id } })
    return raw ? userSessionToDomain(raw) : null
  }

  async findAllActiveByUserId(userId: string): Promise<UserSession[]> {
    const raws = await this.prismaClient.userSession.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    })
    return raws.map(userSessionToDomain)
  }

  async findByIdAndUserId(id: string, userId: string): Promise<UserSession | null> {
    const raw = await this.prismaClient.userSession.findFirst({
      where: { id, userId },
    })
    return raw ? userSessionToDomain(raw) : null
  }

  async revokeAllByUserId(userId: string): Promise<void> {
    await this.prismaClient.userSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }

  async revokeAllByUserIdAndProject(userId: string, projectId: string): Promise<void> {
    await this.prismaClient.userSession.updateMany({
      where: { userId, projectId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }

  async deleteExpired(): Promise<void> {
    await this.prismaClient.userSession.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    })
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.prismaClient.userSession.deleteMany({ where: { userId } })
  }

  async deleteByProjectId(projectId: string): Promise<void> {
    await this.prismaClient.userSession.deleteMany({ where: { projectId } })
  }
}
