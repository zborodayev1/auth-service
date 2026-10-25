import type { NextFunction, Response, Request } from 'express'
import { inject, injectable } from 'inversify'

import { ClientSessionRepository } from '@aggregates/clientSession/ClientSessionRepository'
import { ClientAccessTokenService } from '@ports/ClientAccessTokenService'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { AUTH_ERROR_CODES } from '@shared/errors/ErrorCodes'

@injectable()
export class ClientAuthMiddleware {
  constructor(
    @inject(ClientAccessTokenService)
    private readonly accessTokens: ClientAccessTokenService,

    @inject(ClientSessionRepository)
    private readonly sessions: ClientSessionRepository,
  ) {}

  async authenticate(req: Request, _: Response, next: NextFunction): Promise<void> {
    const header = req.header('authorization')

    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing bearer token', AUTH_ERROR_CODES.UNAUTHENTICATED)
    }

    const token = header.substring(7)

    const payload = this.accessTokens.verify(token)

    const session = await this.sessions.findById(payload.sessionId)

    if (!session) {
      throw new UnauthorizedError('Session not found', AUTH_ERROR_CODES.UNAUTHENTICATED)
    }

    if (!session.isActive()) {
      throw new UnauthorizedError('Session expired', AUTH_ERROR_CODES.SESSION_EXPIRED)
    }

    if (session.clientId !== payload.clientId) {
      throw new UnauthorizedError('Invalid session', AUTH_ERROR_CODES.UNAUTHENTICATED)
    }

    req.auth = payload

    next()
  }
}
