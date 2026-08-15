import { Router } from 'express'
import { injectable, inject } from 'inversify'
import { ProjectController } from '../controllers/ProjectController'
import { ClientAuthMiddleware } from '../middleware/ClientAuthMiddleware'
import { mutateRequestRateLimiter, queryRequestRateLimiter } from '../middleware/rateLimiter'

@injectable()
export class ProjectRouter {
  constructor(
    @inject(ProjectController) private readonly controller: ProjectController,
    @inject(ClientAuthMiddleware) private readonly auth: ClientAuthMiddleware,
  ) {}

  build(): Router {
    const router = Router({ mergeParams: true })
    const authenticate = this.auth.authenticate.bind(this.auth)
    const c = this.controller

    // Project CRUD
    router.post('/', mutateRequestRateLimiter, authenticate, c.create.bind(c))
    router.get('/:projectId', queryRequestRateLimiter, authenticate, c.getProject.bind(c))
    router.patch('/:projectId', mutateRequestRateLimiter, authenticate, c.renameProject.bind(c))
    router.delete('/:projectId', mutateRequestRateLimiter, authenticate, c.deleteProject.bind(c))

    // Project fields
    router.get('/:projectId/fields', queryRequestRateLimiter, authenticate, c.getFields.bind(c))
    router.post('/:projectId/fields', mutateRequestRateLimiter, authenticate, c.addField.bind(c))
    router.patch(
      '/:projectId/fields/:fieldId',
      mutateRequestRateLimiter,
      authenticate,
      c.updateField.bind(c),
    )
    router.delete(
      '/:projectId/fields/:fieldId',
      mutateRequestRateLimiter,
      authenticate,
      c.deleteField.bind(c),
    )
    router.post(
      '/:projectId/fields/:fieldId/recover',
      mutateRequestRateLimiter,
      authenticate,
      c.recoverField.bind(c),
    )

    // ApiKey
    router.get('/:projectId/key', queryRequestRateLimiter, authenticate, c.getApiKey.bind(c))
    router.post(
      '/:projectId/key/rotate',
      mutateRequestRateLimiter,
      authenticate,
      c.rotateApiKey.bind(c),
    )
    router.patch('/:projectId/key', mutateRequestRateLimiter, authenticate, c.renameApiKey.bind(c))

    // Users (admin)
    router.get('/:projectId/users', mutateRequestRateLimiter, authenticate, c.getUsers.bind(c))
    router.get(
      '/:projectId/users/:userId',
      mutateRequestRateLimiter,
      authenticate,
      c.getUser.bind(c),
    )
    router.patch(
      '/:projectId/users/:userId/fields/:fieldId',
      mutateRequestRateLimiter,
      authenticate,
      c.updateUserField.bind(c),
    )
    router.delete(
      '/:projectId/users/:userId',
      mutateRequestRateLimiter,
      authenticate,
      c.deleteUser.bind(c),
    )

    return router
  }
}
