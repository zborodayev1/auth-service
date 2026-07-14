import cookieParser from 'cookie-parser'
import express, { Express } from 'express'
import helmet from 'helmet'
import { injectable } from 'inversify'

@injectable()
export class ExpressApp {
  private readonly app: Express

  constructor() {
    this.app = express()
    this.setup()
  }

  private setup(): void {
    this.app.use(express.json())
    this.app.use(helmet())
    this.app.use(cookieParser())
  }

  getInstance(): Express {
    return this.app
  }
}
