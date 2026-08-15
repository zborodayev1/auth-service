import { Router } from 'express'
import { ClientController } from '../controllers/ClientController'
import { ClientAuthMiddleware } from '../middleware/ClientAuthMiddleware'
import { injectable, inject } from 'inversify'
import {
  authRateLimiter,
  mutateRequestRateLimiter,
  queryRequestRateLimiter,
} from '../middleware/rateLimiter'

@injectable()
export class ClientRouter {
  constructor(
    @inject(ClientController) private readonly controller: ClientController,
    @inject(ClientAuthMiddleware) private readonly auth: ClientAuthMiddleware,
  ) {}
  build(): Router {
    const router = Router()
    const authenticate = this.auth.authenticate.bind(this.auth)

    const c = this.controller

    router.get('/projects', queryRequestRateLimiter, authenticate, c.getProjects.bind(c))
    router.get('/me', queryRequestRateLimiter, authenticate, c.getProfile.bind(c))

    router.post('/register', mutateRequestRateLimiter, c.register.bind(c))
    router.post('/login', authRateLimiter, c.login.bind(c))

    router.patch('/name', mutateRequestRateLimiter, authenticate, c.changeName.bind(c))
    router.patch('/email', mutateRequestRateLimiter, authenticate, c.changeEmail.bind(c))
    router.patch('/password', mutateRequestRateLimiter, authenticate, c.changePassword.bind(c))

    router.post('/logout', mutateRequestRateLimiter, authenticate, c.logoutCurrent.bind(c))

    router.post('/logout-all', mutateRequestRateLimiter, authenticate, c.logoutAll.bind(c))

    router.get('/sessions', queryRequestRateLimiter, authenticate, c.getSessions.bind(c))
    router.delete(
      '/sessions/:sessionId',
      mutateRequestRateLimiter,
      authenticate,
      c.revokeSession.bind(c),
    )

    router.post('/refresh', authRateLimiter, c.refresh.bind(c))

    return router
  }
}
