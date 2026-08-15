import { inject, injectable } from 'inversify'
import { UserSessionRepository } from '@aggregates/userSession/UserSessionRepository'
import { UserRepository } from '@aggregates/user/UserRepository'
import { LogoutAllUserSessionsCommand } from './LogoutAllUserSessionsCommand'
import { NotFoundError } from '@shared/errors/NotFoundError'

interface LogoutAllUserSessionsResult {
  success: boolean
}

@injectable()
export class LogoutAllUserSessionsHandler {
  constructor(
    @inject(UserSessionRepository)
    private readonly sessions: UserSessionRepository,

    @inject(UserRepository)
    private readonly users: UserRepository,
  ) {}

  async execute(command: LogoutAllUserSessionsCommand): Promise<LogoutAllUserSessionsResult> {
    const user = await this.users.findById(command.userId)
    if (user?.projectId !== command.projectId)
      throw new NotFoundError('User not found', 'USER_NOT_FOUND', {
        userId: command.userId,
        projectId: command.projectId,
      })

    await this.sessions.revokeAllByUserIdAndProject(command.userId, command.projectId)

    return { success: true }
  }
}
