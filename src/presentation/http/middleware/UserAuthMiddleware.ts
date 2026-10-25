import type { NextFunction, Response, Request } from 'express'
import { inject, injectable } from 'inversify'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { UserAccessTokenService } from '@ports/UserAccessTokenService'
import { UserSessionRepository } from '@aggregates/userSession/UserSessionRepository'
import { ProjectRepository } from '@aggregates/project/ProjectRepository'
import { AUTH_ERROR_CODES } from '@shared/errors/ErrorCodes'

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
      throw new UnauthorizedError('Missing bearer token', AUTH_ERROR_CODES.UNAUTHENTICATED)
    }

    const token = header.substring(7)

    const decoded = this.accessTokens.decodeUnverified(token)
    if (!decoded) throw new UnauthorizedError('Invalid token', AUTH_ERROR_CODES.UNAUTHENTICATED)

    const project = await this.projects.findById(decoded.projectId)
    if (!project) throw new UnauthorizedError('Project not found', AUTH_ERROR_CODES.UNAUTHENTICATED)

    const payload = this.accessTokens.verify(token, project.jwtSecret)

    if (req.projectAuth && req.projectAuth.projectId !== payload.projectId) {
      throw new UnauthorizedError('Token project mismatch', AUTH_ERROR_CODES.UNAUTHENTICATED)
    }

    const session = await this.sessions.findById(payload.sessionId)
    if (!session) {
      throw new UnauthorizedError('Session not found', AUTH_ERROR_CODES.UNAUTHENTICATED)
    }

    if (!session.isActive()) {
      throw new UnauthorizedError('Session expired', AUTH_ERROR_CODES.SESSION_EXPIRED)
    }

    if (session.userId !== payload.userId) {
      throw new UnauthorizedError('Invalid session', AUTH_ERROR_CODES.UNAUTHENTICATED)
    }

    req.userAuth = payload

    next()
  }
}
