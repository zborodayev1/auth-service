import { inject, injectable } from 'inversify'
import { LogoutAllSessionsCommand } from './LogoutAllSessionsCommand'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { SessionRepository } from '@aggregates/session/SessionRepository'

interface LogoutAllSessionsResult {
  message: string
}

@injectable()
export class LogoutAllSessionsHandler {
  constructor(
    @inject(SessionRepository)
    private readonly sessions: SessionRepository,
  ) {}

  async execute(command: LogoutAllSessionsCommand): Promise<LogoutAllSessionsResult> {
    const session = await this.sessions.findById(command.sessionId)

    if (!session?.isActive()) {
      throw new UnauthorizedError('Invalid or expired session')
    }

    await this.sessions.revokeAllByClientId(session.clientId)

    return { message: 'All sessions revoked successfully' }
  }
}
