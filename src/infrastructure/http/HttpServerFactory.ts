import http from 'http'
import { inject, injectable } from 'inversify'

import { ExpressApp } from './ExpressApp'

@injectable()
export class HttpServerFactory {
  constructor(
    @inject(ExpressApp)
    private readonly expressApp: ExpressApp,
  ) {}

  create(): http.Server {
    return http.createServer(this.expressApp.getInstance())
  }
}
