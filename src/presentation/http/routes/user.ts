import { Router } from 'express'
import { UserController } from '../controllers/UserController'
import { UserAuthMiddleware } from '../middleware/UserAuthMiddleware'
import { injectable, inject } from 'inversify'

@injectable()
export class UserRouter {
  constructor(
    @inject(UserController) private readonly controller: UserController,
    @inject(UserAuthMiddleware) private readonly auth: UserAuthMiddleware,
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

    router.get('/me', authenticate, c.getProfile.bind(c))
    router.patch('/me/email', authenticate, c.changeEmail.bind(c))
    router.patch('/me/password', authenticate, c.changePassword.bind(c))
    router.delete('/me', authenticate, c.deleteSelf.bind(c))

    router.get('/me/fields', authenticate, c.getFields.bind(c))
    router.get('/me/fields/:name', authenticate, c.getField.bind(c))
    router.patch('/me/fields/:name', authenticate, c.update.bind(c))

    return router
  }
}
