import { UserSessionRepository } from '@aggregates/userSession/UserSessionRepository'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { inject, injectable } from 'inversify'
import { LogoutUserSessionCommand } from './LogoutUserSessionCommand'
import { AUTH_ERROR_CODES } from '@shared/errors/ErrorCodes'

interface LogoutUserSessionResult {
  success: boolean
}

@injectable()
export class LogoutUserSessionHandler {
  constructor(
    @inject(UserSessionRepository)
    private readonly sessions: UserSessionRepository,
  ) {}

  async execute(command: LogoutUserSessionCommand): Promise<LogoutUserSessionResult> {
    const session = await this.sessions.findById(command.sessionId)

    if (!session?.isActive()) {
      throw new UnauthorizedError('Invalid or expired session', AUTH_ERROR_CODES.SESSION_EXPIRED, {
        command: command,
        session: session,
      })
    }

    if (session.userId !== command.userId) {
      throw new UnauthorizedError(
        'Session does not belong to this user',
        AUTH_ERROR_CODES.UNAUTHENTICATED,
        {
          sessionId: command.sessionId,
          commandUserId: command.userId,
        },
      )
    }

    await this.sessions.save(session.revoke())

    return { success: true }
  }
}
