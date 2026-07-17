import type { NextFunction, Response, Request } from 'express'
import { inject, injectable } from 'inversify'

import { SessionRepository } from '@aggregates/session/SessionRepository'
import { AccessTokenService } from '@ports/AccessTokenService'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'

@injectable()
export class AuthMiddleware {
  constructor(
    @inject(AccessTokenService)
    private readonly accessTokens: AccessTokenService,

    @inject(SessionRepository)
    private readonly sessions: SessionRepository,
  ) {}

  async authenticate(req: Request, _: Response, next: NextFunction): Promise<void> {
    const header = req.header('authorization')

    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing bearer token')
    }

    const token = header.substring(7)

    const payload = this.accessTokens.verify(token)

    const session = await this.sessions.findById(payload.sessionId)

    if (!session) {
      throw new UnauthorizedError('Session not found')
    }

    if (!session.isActive()) {
      throw new UnauthorizedError('Session expired', 'SESSION_EXPIRED')
    }

    if (session.clientId !== payload.clientId) {
      throw new UnauthorizedError('Invalid session')
    }

    req.auth = payload

    next()
  }
}
