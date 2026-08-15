import { Container, injectable } from 'inversify'
import { ServiceContext } from '../ServiceContext'

import { ServerConfig } from '@config/server/server'
import { ExpressApp } from '@infra/http/ExpressApp'
import { HttpServerFactory } from '@infra/http/HttpServerFactory'
import { HttpRouterRegistry } from '@infra/http/HttpRouterRegistry'
import { ClientRouter } from '@presentation/http/routes/client'
import { UserRouter } from '@presentation/http/routes/user'
import { ProjectRouter } from '@presentation/http/routes/project'
import { ErrorHandler } from '@presentation/http/middleware/errorHandler'
import { HealthRouter } from '@presentation/http/routes/health'

@injectable()
export class HttpContext implements ServiceContext {
  register(container: Container): void {
    container.bind(ServerConfig).toSelf().inSingletonScope()
    container.bind(ExpressApp).toSelf().inSingletonScope()
    container.bind(HttpServerFactory).toSelf().inSingletonScope()
    container.bind(HttpRouterRegistry).toSelf().inSingletonScope()
    container.bind(ClientRouter).toSelf().inSingletonScope()
    container.bind(UserRouter).toSelf().inSingletonScope()
    container.bind(ProjectRouter).toSelf().inSingletonScope()
    container.bind(HealthRouter).toSelf().inSingletonScope()
    container.bind(ErrorHandler).toSelf().inSingletonScope()
  }
}
