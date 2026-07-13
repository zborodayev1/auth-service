import { inject, injectable } from 'inversify'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { SessionRepository } from '@aggregates/session/SessionRepository'
import { LogoutCurrentSessionCommand } from './LogoutCurrentSessionCommand'

@injectable()
export class LogoutCurrentSessionHandler {
  constructor(
    @inject(SessionRepository)
    private readonly sessions: SessionRepository,
  ) {}

  async execute(command: LogoutCurrentSessionCommand): Promise<void> {
    const session = await this.sessions.findById(command.sessionId)

    if (!session) {
      throw new UnauthorizedError('Invalid session', 'INVALID_SESSION')
    }

    if (session.clientId !== command.clientId) {
      throw new UnauthorizedError('Invalid session for this client', 'INVALID_SESSION')
    }

    if (!session.isActive()) {
      throw new UnauthorizedError('Invalid or expired token', 'INVALID_TOKEN')
    }

    await this.sessions.save(session.revoke())
  }
}
