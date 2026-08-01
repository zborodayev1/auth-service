import { inject, injectable } from 'inversify'
import { LogoutAllClientSessionsCommand } from './LogoutAllClientSessionsCommand'
import { ClientSessionRepository } from '@aggregates/clientSession/ClientSessionRepository'

interface LogoutAllSessionsResult {
  success: boolean
}

@injectable()
export class LogoutAllClientSessionsHandler {
  constructor(
    @inject(ClientSessionRepository)
    private readonly sessions: ClientSessionRepository,
  ) {}

  async execute(command: LogoutAllClientSessionsCommand): Promise<LogoutAllSessionsResult> {
    await this.sessions.revokeAllByClientId(command.clientId)
    return { success: true }
  }
}
