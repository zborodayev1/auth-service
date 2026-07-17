import { RefreshToken } from '@aggregates/refreshToken/RefreshToken'
import { RefreshTokenRepository } from '@aggregates/refreshToken/RefreshTokenRepository'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { inject, injectable } from 'inversify'
import { Hasher } from '@ports/Hasher'
import { KeyGenerator } from '@ports/KeyGenerator'
import { ServerConfig } from '@config/server'
import { RefreshTokenFactory } from '@app/factories/RefreshTokenFactory'
import type { GeneratedRefreshToken } from './types'

@injectable()
export class RefreshTokenService {
  constructor(
    @inject(RefreshTokenRepository)
    private readonly refreshTokens: RefreshTokenRepository,

    @inject(RefreshTokenFactory)
    private readonly refreshFactory: RefreshTokenFactory,

    @inject(Hasher)
    private readonly hasher: Hasher,

    @inject(ServerConfig) private readonly config: ServerConfig,

    @inject(KeyGenerator) private readonly keyGenerator: KeyGenerator,
  ) {}

  async requireValid(rawToken: string): Promise<RefreshToken> {
    const hash = this.hasher.hash(rawToken)

    const token = await this.refreshTokens.findByHash(hash)

    if (!token) {
      throw new UnauthorizedError('Refresh token is invalid', 'REFRESH_TOKEN_INVALID')
    }

    if (token.isExpired()) {
      throw new UnauthorizedError('Expired refresh token')
    }

    if (token.isRevoked()) {
      throw new UnauthorizedError('Revoked refresh token')
    }

    return token
  }

  async detectReuse(token: RefreshToken): Promise<void> {
    if (token.isUsed()) {
      await this.refreshTokens.revokeAllBySessionId(token.sessionId)

      throw new UnauthorizedError('Refresh token reuse detected', 'REFRESH_TOKEN_REUSE_DETECTED')
    }
  }

  async rotate(currentToken: RefreshToken): Promise<GeneratedRefreshToken> {
    await this.refreshTokens.save(currentToken.markAsUsed())

    const refreshData = this.generate()

    const refreshToken = this.refreshFactory.create({
      sessionId: currentToken.sessionId,
      refresh: refreshData,
    })

    await this.refreshTokens.save(refreshToken)

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
