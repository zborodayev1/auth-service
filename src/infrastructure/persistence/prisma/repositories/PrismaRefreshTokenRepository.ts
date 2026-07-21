import { ClientRefreshTokenRepository } from '@aggregates/clientRefreshToken/ClientRefreshTokenRepository'
import { injectable } from 'inversify'

import { PrismaProvider } from '../PrismaProvider'
import { refreshToDomain } from '../mappers/RefreshTokenMapper'
import { ClientRefreshToken } from '@aggregates/clientRefreshToken/RefreshToken'

@injectable()
export class PrismaRefreshTokenRepository implements ClientRefreshTokenRepository {
  constructor(private readonly prisma: PrismaProvider) {}

  async save(token: ClientRefreshToken): Promise<void> {
    await this.prisma.refreshToken.upsert({
      where: { id: token.id },
      update: {
        usedAt: token.usedAt,
        revokedAt: token.revokedAt,
        expiresAt: token.expiresAt,
      },
      create: {
        id: token.id,
        sessionId: token.sessionId,
        hash: token.hash,
        usedAt: token.usedAt,
        revokedAt: token.revokedAt,
        expiresAt: token.expiresAt,
        createdAt: token.createdAt,
      },
    })
  }

  async findById(id: string): Promise<ClientRefreshToken | null> {
    const raw = await this.prisma.refreshToken.findUnique({
      where: { id },
    })
    if (!raw) return null

    return refreshToDomain(raw)
  }

  async findByHash(hash: string): Promise<ClientRefreshToken | null> {
    const raw = await this.prisma.refreshToken.findUnique({
      where: { hash },
    })
    if (!raw) return null

    return refreshToDomain(raw)
  }

  async findBySessionId(sessionId: string): Promise<ClientRefreshToken[]> {
    const raws = await this.prisma.refreshToken.findMany({
      where: { sessionId },
    })

    return raws.map((raw) => refreshToDomain(raw))
  }

  async revokeAllBySessionId(sessionId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        sessionId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    })
  }

  async deleteExpired(): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    })
  }
}
