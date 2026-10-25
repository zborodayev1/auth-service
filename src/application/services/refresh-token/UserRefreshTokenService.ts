import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { inject, injectable } from 'inversify'
import { Hasher } from '@ports/Hasher'
import { KeyGenerator } from '@ports/KeyGenerator'
import { ServerConfig } from '@config/server/server'
import type { GeneratedRefreshToken } from './types'
import { UserRefreshTokenRepository } from '@aggregates/userRefreshToken/UserRefreshTokenRepository'
import { UserRefreshTokenFactory } from '@factories/UserRefreshTokenFactory'
import { UserRefreshToken } from '@aggregates/userRefreshToken/UserRefreshToken'
import { UnitOfWork } from '@ports/UnitOfWork'
import { AUTH_ERROR_CODES } from '@shared/errors/ErrorCodes'

@injectable()
export class UserRefreshTokenService {
  constructor(
    @inject(UnitOfWork) private readonly unitOfWork: UnitOfWork,

    @inject(UserRefreshTokenRepository)
    private readonly refreshTokens: UserRefreshTokenRepository,

    @inject(UserRefreshTokenFactory)
    private readonly clientRefreshFactory: UserRefreshTokenFactory,

    @inject(Hasher)
    private readonly hasher: Hasher,

    @inject(ServerConfig) private readonly config: ServerConfig,

    @inject(KeyGenerator) private readonly keyGenerator: KeyGenerator,
  ) {}

  async requireValid(rawToken: string): Promise<UserRefreshToken> {
    const hash = this.hasher.hash(rawToken)

    const token = await this.refreshTokens.findByHash(hash)

    if (!token) {
      throw new UnauthorizedError('Refresh token is invalid', AUTH_ERROR_CODES.UNAUTHENTICATED)
    }

    if (token.isExpired()) {
      throw new UnauthorizedError('Expired refresh token', AUTH_ERROR_CODES.TOKEN_EXPIRED, {
        token: token,
      })
    }

    if (token.isRevoked()) {
      throw new UnauthorizedError('Revoked refresh token', AUTH_ERROR_CODES.TOKEN_EXPIRED, {
        token: token,
      })
    }

    return token
  }

  async detectReuse(token: UserRefreshToken): Promise<void> {
    if (token.isUsed()) {
      await this.refreshTokens.revokeAllBySessionId(token.sessionId)

      throw new UnauthorizedError('Refresh token reuse detected', AUTH_ERROR_CODES.TOKEN_REUSED, {
        token: token,
      })
    }
  }

  async rotate(currentToken: UserRefreshToken): Promise<GeneratedRefreshToken> {
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
