import 'reflect-metadata'
import http from 'http'
import { ServerConfig } from './config/server/server'
import { inject, injectable } from 'inversify'
import { HttpServerFactory } from '@infra/http/HttpServerFactory'
import { JobManager } from '@infra/jobs/JobManager'
import { PrismaProvider } from '@infra/persistence/prisma/PrismaProvider'
import { RedisProvider } from '@infra/redis/RedisProvider'
import { InternalServerError } from '@shared/errors/InternalServerError'

@injectable()
export class Application {
  private server?: http.Server

  constructor(
    @inject(ServerConfig)
    private readonly config: ServerConfig,

    @inject(HttpServerFactory)
    private readonly httpServerFactory: HttpServerFactory,

    @inject(JobManager)
    private readonly jobs: JobManager,

    @inject(PrismaProvider)
    private readonly prisma: PrismaProvider,

    @inject(RedisProvider)
    private readonly redis: RedisProvider,
  ) {}

  init(): void {
    this.server = this.httpServerFactory.create()
  }

  async start(): Promise<void> {
    const { port } = this.config

    await this.jobs.start()

    await new Promise<void>((resolve) => {
      this.getHttpServer().listen(port, resolve)
    })

    console.log(`Server started on ${String(port)}`)
  }

  async stop(): Promise<void> {
    await this.jobs.stop()
    await new Promise<void>((resolve, reject) => {
      this.getHttpServer().close((err) => {
        if (err) reject(err)
        else resolve()
      })
    })
    await this.prisma.$disconnect()
    await this.redis.disconnect()
  }
  private getHttpServer(): http.Server {
    if (!this.server) {
      throw new InternalServerError('HTTP server is not initialized')
    }

    return this.server
  }
}
