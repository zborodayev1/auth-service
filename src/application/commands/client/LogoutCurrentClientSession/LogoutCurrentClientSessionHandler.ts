import { inject, injectable } from 'inversify'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { ClientSessionRepository } from '@aggregates/clientSession/ClientSessionRepository'
import { LogoutCurrentClientSessionCommand } from './LogoutCurrentClientSessionCommand'

interface LogoutCurrentSessionResult {
  message: string
}

@injectable()
export class LogoutCurrentClientSessionHandler {
  constructor(
    @inject(ClientSessionRepository)
    private readonly sessions: ClientSessionRepository,
  ) {}

  async execute(command: LogoutCurrentClientSessionCommand): Promise<LogoutCurrentSessionResult> {
    const session = await this.sessions.findById(command.sessionId)

    if (!session?.isActive()) {
      throw new UnauthorizedError('Invalid or expired session')
    }

    await this.sessions.save(session.revoke())

    return { message: 'Session revoked successfully' }
  }
}
