import { inject, injectable } from 'inversify'
import { UserSessionRepository } from '@aggregates/userSession/UserSessionRepository'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { ValidationError } from '@shared/errors/ValidationError'
import { RevokeUserSessionCommand } from './RevokeUserSessionCommand'

interface RevokeUserSessionResult {
  success: boolean
}

@injectable()
export class RevokeUserSessionHandler {
  constructor(
    @inject(UserSessionRepository)
    private readonly sessions: UserSessionRepository,
  ) {}

  async execute(command: RevokeUserSessionCommand): Promise<RevokeUserSessionResult> {
    if (command.sessionId === command.currentSessionId) {
      throw new ValidationError(
        'Cannot revoke current session via this endpoint. Use /logout instead.',
        'CURRENT_SESSION_REVOKE',
      )
    }

    const session = await this.sessions.findByIdAndUserId(command.sessionId, command.userId)

    if (!session?.isActive()) {
      throw new NotFoundError('Session not found', 'SESSION_NOT_FOUND', {
        sessionId: command.sessionId,
      })
    }

    await this.sessions.save(session.revoke())

    return { success: true }
  }
}
