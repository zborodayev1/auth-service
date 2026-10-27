import { injectable, inject } from 'inversify'
import cron, { type ScheduledTask } from 'node-cron'
import type { IJob } from '@ports/IJob'
import { ClientSessionRepository } from '@aggregates/clientSession/ClientSessionRepository'
import { ClientRefreshTokenRepository } from '@aggregates/clientRefreshToken/ClientRefreshTokenRepository'
import { UserSessionRepository } from '@aggregates/userSession/UserSessionRepository'
import { UserRefreshTokenRepository } from '@aggregates/userRefreshToken/UserRefreshTokenRepository'
import { PendingActionRepository } from '@aggregates/pendingAction/PendingActionRepository'

@injectable()
export class CleanupJob implements IJob {
  private task?: ScheduledTask

  constructor(
    @inject(ClientSessionRepository)
    private readonly clientSessions: ClientSessionRepository,

    @inject(ClientRefreshTokenRepository)
    private readonly clientTokens: ClientRefreshTokenRepository,

    @inject(UserSessionRepository)
    private readonly userSessions: UserSessionRepository,

    @inject(UserRefreshTokenRepository)
    private readonly userTokens: UserRefreshTokenRepository,

    @inject(PendingActionRepository)
    private readonly actions: PendingActionRepository,
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
    await this.actions.deleteExpired()
  }
}
