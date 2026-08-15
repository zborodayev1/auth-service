import { Router } from 'express'
import { UserController } from '../controllers/UserController'
import { UserAuthMiddleware } from '../middleware/UserAuthMiddleware'
import { ApiKeyAuthMiddleware } from '../middleware/ApiKeyAuthMiddleware'
import { injectable, inject } from 'inversify'
import {
  authRateLimiter,
  mutateRequestRateLimiter,
  queryRequestRateLimiter,
} from '../middleware/rateLimiter'

@injectable()
export class UserRouter {
  constructor(
    @inject(UserController) private readonly controller: UserController,
    @inject(UserAuthMiddleware) private readonly auth: UserAuthMiddleware,
    @inject(ApiKeyAuthMiddleware) private readonly apiKeyAuth: ApiKeyAuthMiddleware,
  ) {}

  build(): Router {
    const router = Router({ mergeParams: true })
    const authenticate = this.auth.authenticate.bind(this.auth)
    const authenticateApiKey = this.apiKeyAuth.authenticate.bind(this.apiKeyAuth)
    const c = this.controller

    router.post('/register', mutateRequestRateLimiter, authenticateApiKey, c.register.bind(c))
    router.post('/login', authRateLimiter, authenticateApiKey, c.login.bind(c))
    router.post('/refresh', authRateLimiter, authenticateApiKey, c.refresh.bind(c))

    router.post(
      '/logout',
      mutateRequestRateLimiter,
      authenticateApiKey,
      authenticate,
      c.logoutCurrent.bind(c),
    )

    router.post(
      '/logout-all',
      mutateRequestRateLimiter,
      authenticateApiKey,
      authenticate,
      c.logoutAll.bind(c),
    )

    router.get(
      '/me',
      queryRequestRateLimiter,
      authenticateApiKey,
      authenticate,
      c.getProfile.bind(c),
    )
    router.patch(
      '/me/email',
      mutateRequestRateLimiter,
      authenticateApiKey,
      authenticate,
      c.changeEmail.bind(c),
    )
    router.patch(
      '/me/password',
      mutateRequestRateLimiter,
      authenticateApiKey,
      authenticate,
      c.changePassword.bind(c),
    )
    router.delete(
      '/me',
      mutateRequestRateLimiter,
      authenticateApiKey,
      authenticate,
      c.deleteSelf.bind(c),
    )

    router.get(
      '/me/fields',
      queryRequestRateLimiter,
      authenticateApiKey,
      authenticate,
      c.getFields.bind(c),
    )
    router.get(
      '/me/fields/:fieldId',
      queryRequestRateLimiter,
      authenticateApiKey,
      authenticate,
      c.getField.bind(c),
    )
    router.patch(
      '/me/fields/:fieldId',
      mutateRequestRateLimiter,
      authenticateApiKey,
      authenticate,
      c.update.bind(c),
    )

    router.get(
      '/me/sessions',
      queryRequestRateLimiter,
      authenticateApiKey,
      authenticate,
      c.getSessions.bind(c),
    )
    router.delete(
      '/me/sessions/:sessionId',
      mutateRequestRateLimiter,
      authenticateApiKey,
      authenticate,
      c.revokeSession.bind(c),
    )

    return router
  }
}
