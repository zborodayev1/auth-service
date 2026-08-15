import { injectable, inject } from 'inversify'
import { UserRefreshToken } from '@aggregates/userRefreshToken/UserRefreshToken'
import type { UserRefreshTokenRepository } from '@aggregates/userRefreshToken/UserRefreshTokenRepository'

import { userRefreshTokenToDomain } from '../mappers/UserRefreshTokenMapper'
import { TransactionContext } from '../TransactionContext'
import { PrismaRepository } from '../PrismaRepository'

@injectable()
export class PrismaUserRefreshTokenRepository
  extends PrismaRepository
  implements UserRefreshTokenRepository
{
  constructor(@inject(TransactionContext) ctx: TransactionContext) {
    super(ctx)
  }

  async save(token: UserRefreshToken): Promise<void> {
    await this.prismaClient.userRefreshToken.upsert({
      where: { id: token.id },
      create: {
        id: token.id,
        sessionId: token.sessionId,
        hash: token.hash,
        usedAt: token.usedAt,
        revokedAt: token.revokedAt,
        expiresAt: token.expiresAt,
        createdAt: token.createdAt,
      },
      update: {
        usedAt: token.usedAt,
        revokedAt: token.revokedAt,
      },
    })
  }

  async findById(id: string): Promise<UserRefreshToken | null> {
    const raw = await this.prismaClient.userRefreshToken.findUnique({ where: { id } })
    return raw ? userRefreshTokenToDomain(raw) : null
  }

  async findByHash(hash: string): Promise<UserRefreshToken | null> {
    const raw = await this.prismaClient.userRefreshToken.findUnique({ where: { hash } })
    return raw ? userRefreshTokenToDomain(raw) : null
  }

  async findBySessionId(sessionId: string): Promise<UserRefreshToken[]> {
    const raws = await this.prismaClient.userRefreshToken.findMany({ where: { sessionId } })
    return raws.map(userRefreshTokenToDomain)
  }

  async revokeAllBySessionId(sessionId: string): Promise<void> {
    await this.prismaClient.userRefreshToken.updateMany({
      where: { sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }

  async deleteExpired(): Promise<void> {
    await this.prismaClient.userRefreshToken.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { not: null } }],
      },
    })
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.prismaClient.userRefreshToken.deleteMany({
      where: { session: { userId } },
    })
  }

  async deleteByProjectId(projectId: string): Promise<void> {
    await this.prismaClient.userRefreshToken.deleteMany({
      where: { session: { projectId } },
    })
  }
}
