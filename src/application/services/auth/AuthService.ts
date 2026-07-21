import type { TokenPair } from '@app/commands/client/RefreshClientAccessToken/RefreshClientAccessTokenHandler'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { inject, injectable } from 'inversify'
import { ClientRefreshTokenService } from '../refresh-token/ClientRefreshTokenService'
import { AccessTokenService } from '@ports/AccessTokenService'
import { ClientSessionRepository } from '@aggregates/clientSession/ClientSessionRepository'
import { ClientRefreshTokenFactory } from '@factories/ClientRefreshTokenFactory'
import { SessionFactory } from '@app/factories/SessionFactory'
import { ClientRefreshTokenRepository } from '@aggregates/clientRefreshToken/ClientRefreshTokenRepository'
import { LoginContext } from './types'

@injectable()
export class AuthService {
  constructor(
    @inject(ClientRefreshTokenService)
    private readonly clientRefreshTokenService: ClientRefreshTokenService,

    @inject(ClientSessionRepository)
    private readonly sessions: ClientSessionRepository,

    @inject(AccessTokenService)
    private readonly accessTokenService: AccessTokenService,

    @inject(SessionFactory)
    private readonly sessionFactory: SessionFactory,

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

  async login(context: LoginContext): Promise<TokenPair> {
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
