import { inject, injectable } from 'inversify'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { ClientSessionRepository } from '@aggregates/clientSession/ClientSessionRepository'
import { LogoutCurrentClientSessionCommand } from './LogoutCurrentClientSessionCommand'
import { AUTH_ERROR_CODES } from '@shared/errors/ErrorCodes'

interface LogoutCurrentSessionResult {
  success: boolean
}

@injectable()
export class LogoutCurrentClientSessionHandler {
  constructor(
    @inject(ClientSessionRepository)
    private readonly sessions: ClientSessionRepository,
  ) {}

  async execute(command: LogoutCurrentClientSessionCommand): Promise<LogoutCurrentSessionResult> {
    const session = await this.sessions.findById(command.sessionId)

    if (!session) {
      throw new UnauthorizedError('Invalid session', AUTH_ERROR_CODES.SESSION_EXPIRED, {
        command: command,
      })
    }

    await this.sessions.save(session.revoke())

    return { success: true }
  }
}
