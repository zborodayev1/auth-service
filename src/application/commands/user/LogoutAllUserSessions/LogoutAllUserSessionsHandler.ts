import { inject, injectable } from 'inversify'
import { UserSessionRepository } from '@aggregates/userSession/UserSessionRepository'
import { LogoutAllUserSessionsCommand } from './LogoutAllUserSessionsCommand'

interface LogoutAllUserSessionsResult {
  success: boolean
}

@injectable()
export class LogoutAllUserSessionsHandler {
  constructor(
    @inject(UserSessionRepository)
    private readonly sessions: UserSessionRepository,
  ) {}

  async execute(command: LogoutAllUserSessionsCommand): Promise<LogoutAllUserSessionsResult> {
    await this.sessions.revokeAllByUserId(command.userId)

    return { success: true }
  }
}
