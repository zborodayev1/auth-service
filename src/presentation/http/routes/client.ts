import { Router } from 'express'
import { ClientController } from '../controllers/ClientController'
import { ClientAuthMiddleware } from '../middleware/ClientAuthMiddleware'
import { injectable } from 'inversify'

@injectable()
export class ClientRouter {
  constructor(
    private readonly controller: ClientController,
    private readonly auth: ClientAuthMiddleware,
  ) {}
  build(): Router {
    const router = Router()
    const authenticate = this.auth.authenticate.bind(this.auth)
    const c = this.controller

    router.get('/projects', authenticate, c.getProjects.bind(c))
    router.get('/me', authenticate, c.getProfile.bind(c))

    router.post('/register', c.register.bind(c))
    router.post('/login', c.login.bind(c))

    router.patch('/name', authenticate, c.changeName.bind(c))
    router.patch('/email', authenticate, c.changeEmail.bind(c))
    router.patch('/password', authenticate, c.changePassword.bind(c))

    router.post('/logout', authenticate, c.logoutCurrent.bind(c))

    router.post('/logout-all', authenticate, c.logoutAll.bind(c))

    router.post('/refresh', c.refresh.bind(c))

    return router
  }
}
