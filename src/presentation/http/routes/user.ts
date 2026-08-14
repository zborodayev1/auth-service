import { Router } from 'express'
import { UserController } from '../controllers/UserController'
import { UserAuthMiddleware } from '../middleware/UserAuthMiddleware'
import { ApiKeyAuthMiddleware } from '../middleware/ApiKeyAuthMiddleware'
import { injectable, inject } from 'inversify'

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

    router.post('/register', authenticateApiKey, c.register.bind(c))
    router.post('/login', authenticateApiKey, c.login.bind(c))
    router.post('/refresh', authenticateApiKey, c.refresh.bind(c))

    router.post('/logout', authenticateApiKey, authenticate, c.logoutCurrent.bind(c))

    router.post('/logout-all', authenticateApiKey, authenticate, c.logoutAll.bind(c))

    router.get('/me', authenticateApiKey, authenticate, c.getProfile.bind(c))
    router.patch('/me/email', authenticateApiKey, authenticate, c.changeEmail.bind(c))
    router.patch('/me/password', authenticateApiKey, authenticate, c.changePassword.bind(c))
    router.delete('/me', authenticateApiKey, authenticate, c.deleteSelf.bind(c))

    router.get('/me/fields', authenticateApiKey, authenticate, c.getFields.bind(c))
    router.get('/me/fields/:fieldId', authenticateApiKey, authenticate, c.getField.bind(c))
    router.patch('/me/fields/:fieldId', authenticateApiKey, authenticate, c.update.bind(c))

    router.get('/me/sessions', authenticateApiKey, authenticate, c.getSessions.bind(c))
    router.delete(
      '/me/sessions/:sessionId',
      authenticateApiKey,
      authenticate,
      c.revokeSession.bind(c),
    )

    return router
  }
}
