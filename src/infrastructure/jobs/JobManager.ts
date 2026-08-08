import { injectable, multiInject } from 'inversify'
import { IJob } from '@ports/IJob'

@injectable()
export class JobManager {
  constructor(@multiInject(IJob) private readonly jobs: IJob[]) {}

  start(): void {
    for (const job of this.jobs) job.start()
  }

  async stop(): Promise<void> {
    await Promise.all(this.jobs.map((job) => job.stop()))
  }
}
