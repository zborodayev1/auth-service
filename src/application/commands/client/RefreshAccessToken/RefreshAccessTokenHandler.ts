import { AccessTokenService } from '@ports/AccessTokenService'
import { Hasher } from '@ports/Hasher'
import { inject, injectable } from 'inversify'
import type { RefreshAccessTokenCommand } from './RefreshAccessTokenCommand'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { SessionRepository } from '@aggregates/session/SessionRepository'
import { SessionService } from '@app/services/SessionService'

export interface RefreshAccessTokenResult {
  accessToken: string
  refreshToken: string
}

@injectable()
export class RefreshAccessTokenHandler {
  constructor(
    @inject(SessionRepository)
    private readonly sessions: SessionRepository,

    @inject(Hasher)
    private readonly hasher: Hasher,

    @inject(AccessTokenService)
    private readonly tokenService: AccessTokenService,

    @inject(SessionService)
    private readonly sessionService: SessionService,
  ) {}

  async execute(command: RefreshAccessTokenCommand): Promise<RefreshAccessTokenResult> {
    const hash = this.hasher.hash(command.rawToken)
    const session = await this.sessions.findByRefreshTokenHash(hash)

    if (!session?.isActive()) {
      throw new UnauthorizedError('Invalid or expired refresh token', 'INVALID_TOKEN')
    }

    const refresh = this.sessionService.generateRefreshToken()

    const updatedSession = session.rotateRefreshToken(refresh.hash, refresh.expiresAt)

    await this.sessions.save(updatedSession)

    const accessToken = this.tokenService.sign(session.clientId, session.id)
    return { accessToken, refreshToken: refresh.rawRefreshToken }
  }
}
