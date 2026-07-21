import { injectable } from 'inversify'
import { UserRefreshToken } from '@aggregates/userRefreshToken/UserRefreshToken'
import type { UserRefreshTokenRepository } from '@aggregates/userRefreshToken/UserRefreshTokenRepository'
import { PrismaProvider } from '../PrismaProvider'
import { userRefreshTokenToDomain } from '../mappers/UserRefreshTokenMapper'

@injectable()
export class PrismaUserRefreshTokenRepository implements UserRefreshTokenRepository {
  constructor(private readonly prisma: PrismaProvider) {}

  async save(token: UserRefreshToken): Promise<void> {
    await this.prisma.userRefreshToken.upsert({
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
    const raw = await this.prisma.userRefreshToken.findUnique({ where: { id } })
    return raw ? userRefreshTokenToDomain(raw) : null
  }

  async findByHash(hash: string): Promise<UserRefreshToken | null> {
    const raw = await this.prisma.userRefreshToken.findUnique({ where: { hash } })
    return raw ? userRefreshTokenToDomain(raw) : null
  }

  async findBySessionId(sessionId: string): Promise<UserRefreshToken[]> {
    const raws = await this.prisma.userRefreshToken.findMany({ where: { sessionId } })
    return raws.map(userRefreshTokenToDomain)
  }

  async revokeAllBySessionId(sessionId: string): Promise<void> {
    await this.prisma.userRefreshToken.updateMany({
      where: { sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }

  async deleteExpired(): Promise<void> {
    await this.prisma.userRefreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    })
  }
}
