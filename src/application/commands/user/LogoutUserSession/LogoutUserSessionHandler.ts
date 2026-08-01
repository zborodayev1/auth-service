import { UserSessionRepository } from '@aggregates/userSession/UserSessionRepository'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { inject, injectable } from 'inversify'
import { LogoutUserSessionCommand } from './LogoutUserSessionCommand'

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
      throw new UnauthorizedError('Invalid or expired session', 'EXPIRED_SESSION', {
        command: command,
        session: session,
      })
    }

    await this.sessions.save(session.revoke())

    return { success: true }
  }
}
