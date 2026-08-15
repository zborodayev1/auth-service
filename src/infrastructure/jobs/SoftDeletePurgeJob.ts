import { injectable, inject } from 'inversify'
import cron, { type ScheduledTask } from 'node-cron'
import { PrismaProvider } from '@infra/persistence/prisma/PrismaProvider'
import { ServerConfig } from '@config/server/server'
import type { IJob } from '@ports/IJob'

@injectable()
export class SoftDeletePurgeJob implements IJob {
  private task?: ScheduledTask

  constructor(
    @inject(PrismaProvider) private readonly prisma: PrismaProvider,
    @inject(ServerConfig) private readonly config: ServerConfig,
  ) {}

  start(): Promise<void> {
    this.task = cron.schedule('0 * * * *', () => void this.purge())
    return Promise.resolve()
  }

  async stop(): Promise<void> {
    await this.task?.stop()
  }

  private async purge(): Promise<void> {
    const cutoff = new Date(Date.now() - this.config.softDeleteTtlMs)
    await this.prisma.userFieldValue.deleteMany({ where: { deletedAt: { lt: cutoff } } })
    await this.prisma.projectField.deleteMany({ where: { deletedAt: { lt: cutoff } } })
  }
}
