import 'reflect-metadata'
import http from 'http'
import { ServerConfig } from './config/server/server'
import { inject, injectable } from 'inversify'
import { HttpServerFactory } from '@infra/http/HttpServerFactory'
import { InternalServerError } from '@shared/errors/InternalServerError'

@injectable()
export class Application {
  private server?: http.Server

  constructor(
    @inject(ServerConfig)
    private readonly config: ServerConfig,

    @inject(HttpServerFactory)
    private readonly httpServerFactory: HttpServerFactory,
  ) {}

  init(): void {
    this.server = this.httpServerFactory.create()
  }

  async start(): Promise<void> {
    const { port } = this.config

    await new Promise<void>((resolve) => {
      this.getHttpServer().listen(port, resolve)
    })

    console.log(`Server started on ${String(port)}`)
  }

  async stop(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.getHttpServer().close((err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }
  private getHttpServer(): http.Server {
    if (!this.server) {
      throw new InternalServerError('HTTP server is not initialized')
    }

    return this.server
  }
}
