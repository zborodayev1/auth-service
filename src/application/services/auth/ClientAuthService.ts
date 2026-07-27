import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { inject, injectable } from 'inversify'
import { ClientRefreshTokenService } from '../refresh-token/ClientRefreshTokenService'
import { ClientAccessTokenService } from '@ports/ClientAccessTokenService'
import { ClientSessionRepository } from '@aggregates/clientSession/ClientSessionRepository'
import { ClientRefreshTokenFactory } from '@factories/ClientRefreshTokenFactory'
import { ClientSessionFactory } from '@factories/ClientSessionFactory'
import { ClientRefreshTokenRepository } from '@aggregates/clientRefreshToken/ClientRefreshTokenRepository'
import { ClientLoginContext, TokenPair } from './types'

@injectable()
export class ClientAuthService {
  constructor(
    @inject(ClientRefreshTokenService)
    private readonly clientRefreshTokenService: ClientRefreshTokenService,

    @inject(ClientSessionRepository)
    private readonly sessions: ClientSessionRepository,

    @inject(ClientAccessTokenService)
    private readonly accessTokenService: ClientAccessTokenService,

    @inject(ClientSessionFactory)
    private readonly sessionFactory: ClientSessionFactory,

    @inject(ClientRefreshTokenFactory)
    private readonly clientRefreshFactory: ClientRefreshTokenFactory,

    @inject(ClientRefreshTokenRepository)
    private readonly refreshTokens: ClientRefreshTokenRepository,
  ) {}

  async refresh(rawToken: string): Promise<TokenPair> {
    const token = await this.clientRefreshTokenService.requireValid(rawToken)

    await this.clientRefreshTokenService.detectReuse(token)

    const session = await this.sessions.findById(token.sessionId)

    if (!session?.isActive()) {
      throw new UnauthorizedError('Session is invalid or has been revoked')
    }

    const refresh = await this.clientRefreshTokenService.rotate(token)

    await this.sessions.save(session.touch())

    return {
      accessToken: this.accessTokenService.sign(session.clientId, session.id),
      refreshToken: refresh.rawRefreshToken,
    }
  }

  async login(context: ClientLoginContext): Promise<TokenPair> {
    const refreshData = this.clientRefreshTokenService.generate()

    const session = this.sessionFactory.create({
      clientId: context.clientId,
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
      deviceName: context.deviceName,
      expiresAt: refreshData.expiresAt,
    })

    const refreshToken = this.clientRefreshFactory.create({
      sessionId: session.id,
      refresh: refreshData,
    })

    await this.sessions.save(session)

    await this.refreshTokens.save(refreshToken)

    const accessToken = this.accessTokenService.sign(context.clientId, session.id)

    return { accessToken, refreshToken: refreshData.rawRefreshToken }
  }
}
