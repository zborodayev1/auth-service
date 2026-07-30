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
    const authenticate = this.auth.authenticate.bind(this.auth)
    const c = this.controller

    router.post('/register', c.register.bind(c))
    router.post('/login', c.login.bind(c))
    router.post('/refresh', c.refresh.bind(c))

    router.post('/logout', authenticate, c.logoutCurrent.bind(c))

    router.post('/logout-all', authenticate, c.logoutAll.bind(c))

    router.patch('/me/fields/:name', authenticate, c.update.bind(c))

    return router
  }
}
