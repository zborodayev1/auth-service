import { Hasher } from '@ports/Hasher'
import { inject, injectable } from 'inversify'
import { LogoutAllSessionsCommand } from './LogoutAllSessionsCommand'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { SessionRepository } from '@aggregates/session/SessionRepository'

@injectable()
export class LogoutAllSessionsHandler {
  constructor(
    @inject(SessionRepository)
    private readonly sessions: SessionRepository,

    @inject(Hasher)
    private readonly hasher: Hasher,
  ) {}

  async execute(command: LogoutAllSessionsCommand): Promise<void> {
    const hash = this.hasher.hash(command.rawToken)
    const session = await this.sessions.findByRefreshTokenHash(hash)

    if (!session?.isActive()) {
      throw new UnauthorizedError('Invalid or expired token', 'INVALID_TOKEN')
    }

    await this.sessions.revokeAllByClientId(session.clientId)
  }
}
