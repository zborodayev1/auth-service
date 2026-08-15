import { injectable, inject } from 'inversify'
import cron, { type ScheduledTask } from 'node-cron'
import type { IJob } from '@ports/IJob'
import type { ClientSessionRepository } from '@aggregates/clientSession/ClientSessionRepository'
import type { ClientRefreshTokenRepository } from '@aggregates/clientRefreshToken/ClientRefreshTokenRepository'
import type { UserSessionRepository } from '@aggregates/userSession/UserSessionRepository'
import type { UserRefreshTokenRepository } from '@aggregates/userRefreshToken/UserRefreshTokenRepository'
import { ClientSessionRepository as ClientSessionRepositoryToken } from '@aggregates/clientSession/ClientSessionRepository'
import { ClientRefreshTokenRepository as ClientRefreshTokenRepositoryToken } from '@aggregates/clientRefreshToken/ClientRefreshTokenRepository'
import { UserSessionRepository as UserSessionRepositoryToken } from '@aggregates/userSession/UserSessionRepository'
import { UserRefreshTokenRepository as UserRefreshTokenRepositoryToken } from '@aggregates/userRefreshToken/UserRefreshTokenRepository'

@injectable()
export class CleanupJob implements IJob {
  private task?: ScheduledTask

  constructor(
    @inject(ClientSessionRepositoryToken)
    private readonly clientSessions: ClientSessionRepository,

    @inject(ClientRefreshTokenRepositoryToken)
    private readonly clientTokens: ClientRefreshTokenRepository,

    @inject(UserSessionRepositoryToken)
    private readonly userSessions: UserSessionRepository,

    @inject(UserRefreshTokenRepositoryToken)
    private readonly userTokens: UserRefreshTokenRepository,
  ) {}

  start(): Promise<void> {
    this.task = cron.schedule('0 * * * *', () => void this.purge())
    return Promise.resolve()
  }

  async stop(): Promise<void> {
    await this.task?.stop()
  }

  private async purge(): Promise<void> {
    await this.clientSessions.deleteExpired()
    await this.clientTokens.deleteExpired()
    await this.userSessions.deleteExpired()
    await this.userTokens.deleteExpired()
  }
}
