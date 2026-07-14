import { inject, injectable } from 'inversify'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { SessionRepository } from '@aggregates/session/SessionRepository'
import { LogoutCurrentSessionCommand } from './LogoutCurrentSessionCommand'

interface LogoutCurrentSessionResult {
  message: string
}

@injectable()
export class LogoutCurrentSessionHandler {
  constructor(
    @inject(SessionRepository)
    private readonly sessions: SessionRepository,
  ) {}

  async execute(command: LogoutCurrentSessionCommand): Promise<LogoutCurrentSessionResult> {
    const session = await this.sessions.findById(command.sessionId)

    if (!session?.isActive()) {
      throw new UnauthorizedError('Invalid or expired session')
    }

    await this.sessions.save(session.revoke())

    return { message: 'Session revoked successfully' }
  }
}
