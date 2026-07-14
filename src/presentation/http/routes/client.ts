import { Router } from 'express'
import type { ClientController } from '../controllers/ClientController'
import type { AuthMiddleware } from '../middleware/AuthMiddleware'

export class ClientRouter {
  constructor(
    private readonly controller: ClientController,
    private readonly auth: AuthMiddleware,
  ) {}
  build(): Router {
    const router = Router()

    router.post('/register', this.controller.register.bind(this.controller))
    router.post('/login', this.controller.login.bind(this.controller))

    router.patch(
      '/email',
      this.auth.authenticate.bind(this.auth),
      this.controller.changeEmail.bind(this.controller),
    )

    router.patch(
      '/password',
      this.auth.authenticate.bind(this.auth),
      this.controller.changePassword.bind(this.controller),
    )

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

    router.post('/refresh', this.controller.refresh.bind(this.controller))

    return router
  }
}
