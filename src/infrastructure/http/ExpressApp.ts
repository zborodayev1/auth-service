import cookieParser from 'cookie-parser'
import express, { Express } from 'express'
import helmet from 'helmet'
import { injectable, inject } from 'inversify'
import { HttpRouterRegistry } from './HttpRouterRegistry'

@injectable()
export class ExpressApp {
  private readonly app: Express

  constructor(@inject(HttpRouterRegistry) private readonly routerRegistry: HttpRouterRegistry) {
    this.app = express()
    this.setup()
  }

  private setup(): void {
    this.app.use(express.json())
    this.app.use(helmet())
    this.app.use(cookieParser())
    this.routerRegistry.register(this.app)
  }

  getInstance(): Express {
    return this.app
  }
}
