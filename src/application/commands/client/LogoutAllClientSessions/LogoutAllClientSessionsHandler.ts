import { inject, injectable } from 'inversify'
import { LogoutAllClientSessionsCommand } from './LogoutAllClientSessionsCommand'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { ClientSessionRepository } from '@aggregates/clientSession/ClientSessionRepository'

interface LogoutAllSessionsResult {
  message: string
}

@injectable()
export class LogoutAllClientSessionsHandler {
  constructor(
    @inject(ClientSessionRepository)
    private readonly sessions: ClientSessionRepository,
  ) {}

  async execute(command: LogoutAllClientSessionsCommand): Promise<LogoutAllSessionsResult> {
    const session = await this.sessions.findById(command.sessionId)

    if (!session?.isActive()) {
      throw new UnauthorizedError('Invalid or expired session')
    }

    await this.sessions.revokeAllByClientId(session.clientId)

    return { message: 'All sessions revoked successfully' }
  }
}
