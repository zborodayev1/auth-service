import type { NextFunction, Response, Request } from 'express'
import { inject, injectable } from 'inversify'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { UserAccessTokenService } from '@ports/UserAccessTokenService'
import { UserSessionRepository } from '@aggregates/userSession/UserSessionRepository'
import { ProjectRepository } from '@aggregates/project/ProjectRepository'

@injectable()
export class UserAuthMiddleware {
  constructor(
    @inject(UserAccessTokenService)
    private readonly accessTokens: UserAccessTokenService,

    @inject(UserSessionRepository)
    private readonly sessions: UserSessionRepository,

    @inject(ProjectRepository)
    private readonly projects: ProjectRepository,
  ) {}

  async authenticate(req: Request, _: Response, next: NextFunction): Promise<void> {
    const header = req.header('authorization')

    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing bearer token')
    }

    const token = header.substring(7)

    const decoded = this.accessTokens.decodeUnverified(token)
    if (!decoded) throw new UnauthorizedError('Invalid token')

    const project = await this.projects.findById(decoded.projectId)
    if (!project) throw new UnauthorizedError('Project not found')

    const payload = this.accessTokens.verify(token, project.jwtSecret)

    const session = await this.sessions.findById(payload.sessionId)
    if (!session) {
      throw new UnauthorizedError('Session not found')
    }

    if (!session.isActive()) {
      throw new UnauthorizedError('Session expired', 'SESSION_EXPIRED')
    }

    if (session.userId !== payload.userId) {
      throw new UnauthorizedError('Invalid session')
    }

    req.userAuth = payload

    next()
  }
}
