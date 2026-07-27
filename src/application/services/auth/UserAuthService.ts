import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { inject, injectable } from 'inversify'
import { TokenPair, UserLoginContext } from './types'
import { UserSessionRepository } from '@aggregates/userSession/UserSessionRepository'
import { UserRefreshTokenFactory } from '@factories/UserRefreshTokenFactory'
import { UserSessionFactory } from '@factories/UserSessionFactory'
import { UserRefreshTokenService } from '@services/refresh-token/UserRefreshTokenService'
import { UserRefreshTokenRepository } from '@aggregates/userRefreshToken/UserRefreshTokenRepository'
import { UserAccessTokenService } from '@ports/UserAccessTokenService'
import { ProjectRepository } from '@aggregates/project/ProjectRepository'

@injectable()
export class UserAuthService {
  constructor(
    @inject(UserRefreshTokenService)
    private readonly userRefreshTokenService: UserRefreshTokenService,

    @inject(UserSessionRepository)
    private readonly sessions: UserSessionRepository,

    @inject(UserAccessTokenService)
    private readonly accessTokenService: UserAccessTokenService,

    @inject(UserSessionFactory)
    private readonly sessionFactory: UserSessionFactory,

    @inject(UserRefreshTokenFactory)
    private readonly userRefreshFactory: UserRefreshTokenFactory,

    @inject(UserRefreshTokenRepository)
    private readonly refreshTokens: UserRefreshTokenRepository,

    @inject(ProjectRepository)
    private readonly projects: ProjectRepository,
  ) {}

  async refresh(rawToken: string): Promise<TokenPair> {
    const token = await this.userRefreshTokenService.requireValid(rawToken)
    await this.userRefreshTokenService.detectReuse(token)

    const session = await this.sessions.findById(token.sessionId)
    if (!session?.isActive()) {
      throw new UnauthorizedError('Session is invalid or has been revoked')
    }

    const project = await this.projects.findById(session.projectId)

    if (!project) {
      throw new UnauthorizedError('Invalid token')
    }

    const refresh = await this.userRefreshTokenService.rotate(token)

    await this.sessions.save(session.touch())

    return {
      accessToken: this.accessTokenService.sign(
        session.userId,
        project.id,
        session.id,
        project.jwtSecret,
      ),
      refreshToken: refresh.rawRefreshToken,
    }
  }

  async login(context: UserLoginContext): Promise<TokenPair> {
    const refreshData = this.userRefreshTokenService.generate()

    const session = this.sessionFactory.create({
      userId: context.userId,
      projectId: context.projectId,
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
      deviceName: context.deviceName,
      expiresAt: refreshData.expiresAt,
    })

    const refreshToken = this.userRefreshFactory.create({
      sessionId: session.id,
      refresh: refreshData,
    })

    const project = await this.projects.findById(context.projectId)
    if (!project) throw new UnauthorizedError('Project not found')

    await this.sessions.save(session)

    await this.refreshTokens.save(refreshToken)

    const accessToken = this.accessTokenService.sign(
      context.userId,
      context.projectId,
      session.id,
      project.jwtSecret,
    )

    return { accessToken, refreshToken: refreshData.rawRefreshToken }
  }
}
