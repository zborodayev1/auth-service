import { Router } from 'express'
import { UserController } from '../controllers/UserController'
import { UserAuthMiddleware } from '../middleware/UserAuthMiddleware'
import { injectable } from 'inversify'

@injectable()
export class UserRouter {
  constructor(
    private readonly controller: UserController,
    private readonly auth: UserAuthMiddleware,
  ) {}

  build(): Router {
    const router = Router({ mergeParams: true })

    router.post('/register', this.controller.register.bind(this.controller))
    router.post('/login', this.controller.login.bind(this.controller))
    router.post('/refresh', this.controller.refresh.bind(this.controller))

    router.post(
      '/logout',
      this.auth.authenticate.bind(this.auth),
      this.controller.logoutCurrent.bind(this.controller),
    )

    router.post(
      '/logout-all',
      this.auth.authenticate.bind(this.auth),
      this.controller.logoutAll.bind(this.controller),
    )

    return router
  }
}
