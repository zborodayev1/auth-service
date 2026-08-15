import type { Express } from 'express'
import { injectable, inject } from 'inversify'
import { ClientRouter } from '@presentation/http/routes/client'
import { UserRouter } from '@presentation/http/routes/user'
import { ErrorHandler } from '@presentation/http/middleware/errorHandler'
import { ProjectRouter } from '@presentation/http/routes/project'
import { HealthRouter } from '@presentation/http/routes/health'

@injectable()
export class HttpRouterRegistry {
  constructor(
    @inject(ClientRouter) private readonly clientRouter: ClientRouter,
    @inject(UserRouter) private readonly userRouter: UserRouter,
    @inject(ProjectRouter) private readonly projectRouter: ProjectRouter,
    @inject(HealthRouter) private readonly healthRouter: HealthRouter,
    @inject(ErrorHandler) private readonly errorHandler: ErrorHandler,
  ) {}

  register(app: Express): void {
    app.use('/health', this.healthRouter.build())
    app.use('/clients', this.clientRouter.build())
    app.use('/projects/:projectId/users', this.userRouter.build())
    app.use('/projects', this.projectRouter.build())
    app.use(this.errorHandler.handle)
  }
}
