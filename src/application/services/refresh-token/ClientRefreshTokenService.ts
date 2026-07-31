import { ClientRefreshTokenRepository } from '@aggregates/clientRefreshToken/ClientRefreshTokenRepository'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { inject, injectable } from 'inversify'
import { Hasher } from '@ports/Hasher'
import { KeyGenerator } from '@ports/KeyGenerator'
import { ServerConfig } from '@config/server/server'
import { ClientRefreshTokenFactory } from '@factories/ClientRefreshTokenFactory'
import type { GeneratedRefreshToken } from './types'
import { ClientRefreshToken } from '@aggregates/clientRefreshToken/RefreshToken'
import { UnitOfWork } from '@ports/UnitOfWork'

@injectable()
export class ClientRefreshTokenService {
  constructor(
    @inject(UnitOfWork) private readonly unitOfWork: UnitOfWork,

    @inject(ClientRefreshTokenRepository)
    private readonly refreshTokens: ClientRefreshTokenRepository,

    @inject(ClientRefreshTokenFactory)
    private readonly clientRefreshFactory: ClientRefreshTokenFactory,

    @inject(Hasher)
    private readonly hasher: Hasher,

    @inject(ServerConfig) private readonly config: ServerConfig,

    @inject(KeyGenerator) private readonly keyGenerator: KeyGenerator,
  ) {}

  async requireValid(rawToken: string): Promise<ClientRefreshToken> {
    const hash = this.hasher.hash(rawToken)

    const token = await this.refreshTokens.findByHash(hash)

    if (!token) {
      throw new UnauthorizedError('Refresh token is invalid', 'REFRESH_TOKEN_INVALID')
    }

    if (token.isExpired()) {
      throw new UnauthorizedError('Expired refresh token', 'REFRESH_TOKEN_EXPIRED', {
        token: token,
      })
    }

    if (token.isRevoked()) {
      throw new UnauthorizedError('Revoked refresh token', 'REFRESH_TOKEN_REVOKED', {
        token: token,
      })
    }

    return token
  }

  async detectReuse(token: ClientRefreshToken): Promise<void> {
    if (token.isUsed()) {
      await this.refreshTokens.revokeAllBySessionId(token.sessionId)

      throw new UnauthorizedError('Refresh token reuse detected', 'REFRESH_TOKEN_REUSE_DETECTED', {
        token,
      })
    }
  }

  async rotate(currentToken: ClientRefreshToken): Promise<GeneratedRefreshToken> {
    const markedToken = currentToken.markAsUsed()

    const refreshData = this.generate()

    const refreshToken = this.clientRefreshFactory.create({
      sessionId: currentToken.sessionId,
      refresh: refreshData,
    })

    await this.unitOfWork.execute(async () => {
      await this.refreshTokens.save(markedToken)
      await this.refreshTokens.save(refreshToken)
    })

    return refreshData
  }

  generate(): GeneratedRefreshToken {
    const rawRefreshToken = this.keyGenerator.generate()

    return {
      rawRefreshToken,
      hash: this.hasher.hash(rawRefreshToken),
      expiresAt: new Date(Date.now() + this.config.refreshTokenTtlMs),
    }
  }
}
