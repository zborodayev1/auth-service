import type { TokenPair } from '@app/commands/client/RefreshAccessToken/RefreshAccessTokenHandler'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { inject, injectable } from 'inversify'
import { RefreshTokenService } from '../refresh-token/RefreshTokenService'
import { AccessTokenService } from '@ports/AccessTokenService'
import { SessionRepository } from '@aggregates/session/SessionRepository'
import { RefreshTokenFactory } from '@app/factories/RefreshTokenFactory'
import { SessionFactory } from '@app/factories/SessionFactory'
import { RefreshTokenRepository } from '@aggregates/refreshToken/RefreshTokenRepository'
import { LoginContext } from './types'

@injectable()
export class AuthService {
  constructor(
    @inject(RefreshTokenService)
    private readonly refreshTokenService: RefreshTokenService,

    @inject(SessionRepository)
    private readonly sessions: SessionRepository,

    @inject(AccessTokenService)
    private readonly accessTokenService: AccessTokenService,

    @inject(SessionFactory)
    private readonly sessionFactory: SessionFactory,

    @inject(RefreshTokenFactory)
    private readonly refreshFactory: RefreshTokenFactory,

    @inject(RefreshTokenRepository)
    private readonly refreshTokens: RefreshTokenRepository,
  ) {}

  async refresh(rawToken: string): Promise<TokenPair> {
    const token = await this.refreshTokenService.requireValid(rawToken)

    await this.refreshTokenService.detectReuse(token)

    const session = await this.sessions.findById(token.sessionId)

    if (!session?.isActive()) {
      throw new UnauthorizedError('Session is invalid or has been revoked')
    }

    const refresh = await this.refreshTokenService.rotate(token)

    await this.sessions.save(session.touch())

    return {
      accessToken: this.accessTokenService.sign(session.clientId, session.id),
      refreshToken: refresh.rawRefreshToken,
    }
  }

  async login(context: LoginContext): Promise<TokenPair> {
    const refreshData = this.refreshTokenService.generate()

    const session = this.sessionFactory.create({
      clientId: context.clientId,
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
      deviceName: context.deviceName,
      expiresAt: refreshData.expiresAt,
    })

    const refreshToken = this.refreshFactory.create({
      sessionId: session.id,
      refresh: refreshData,
    })

    await this.sessions.save(session)

    await this.refreshTokens.save(refreshToken)

    const accessToken = this.accessTokenService.sign(context.clientId, session.id)

    return { accessToken, refreshToken: refreshData.rawRefreshToken }
  }
}
