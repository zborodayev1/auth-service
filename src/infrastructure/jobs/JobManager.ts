import { injectable, multiInject } from 'inversify'
import { IJob } from '@ports/IJob'

@injectable()
export class JobManager {
  constructor(@multiInject(IJob) private readonly jobs: IJob[]) {}

  async start(): Promise<void> {
    await Promise.all(this.jobs.map((job) => job.start()))
  }

  async stop(): Promise<void> {
    await Promise.all(this.jobs.map((job) => job.stop()))
  }
}
