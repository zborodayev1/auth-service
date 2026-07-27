import type { Express } from 'express'
import { injectable } from 'inversify'
import { ClientRouter } from '@presentation/http/routes/client'
import { UserRouter } from '@presentation/http/routes/user'
import { ErrorHandler } from '@presentation/http/middleware/errorHandler'
import { ProjectRouter } from '@presentation/http/routes/project'

@injectable()
export class HttpRouterRegistry {
  constructor(
    private readonly clientRouter: ClientRouter,
    private readonly userRouter: UserRouter,
    private readonly projectRouter: ProjectRouter,
    private readonly errorHandler: ErrorHandler,
  ) {}

  register(app: Express): void {
    app.use('/clients', this.clientRouter.build())
    app.use('/projects/:projectId/users', this.userRouter.build())
    app.use('/projects', this.projectRouter.build())
    app.use(this.errorHandler.handle)
  }
}
