import { Router } from 'express'
import { injectable, inject } from 'inversify'
import { ProjectController } from '../controllers/ProjectController'
import { ClientAuthMiddleware } from '../middleware/ClientAuthMiddleware'

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
    router.post('/', authenticate, c.create.bind(c))
    router.get('/:projectId', authenticate, c.getProject.bind(c))
    router.patch('/:projectId', authenticate, c.renameProject.bind(c))
    router.delete('/:projectId', authenticate, c.deleteProject.bind(c))

    // Project fields
    router.get('/:projectId/fields', authenticate, c.getFields.bind(c))
    router.post('/:projectId/fields', authenticate, c.addField.bind(c))
    router.patch('/:projectId/fields/:fieldId', authenticate, c.updateField.bind(c))
    router.delete('/:projectId/fields/:fieldId', authenticate, c.deleteField.bind(c))
    router.post('/:projectId/fields/:fieldId/recover', authenticate, c.recoverField.bind(c))

    // ApiKey
    router.get('/:projectId/key', authenticate, c.getApiKey.bind(c))
    router.post('/:projectId/key/rotate', authenticate, c.rotateApiKey.bind(c))
    router.patch('/:projectId/key', authenticate, c.renameApiKey.bind(c))

    // Users (admin)
    router.get('/:projectId/users', authenticate, c.getUsers.bind(c))
    router.get('/:projectId/users/:userId', authenticate, c.getUser.bind(c))
    router.patch('/:projectId/users/:userId/fields/:name', authenticate, c.updateUserField.bind(c))
    router.delete('/:projectId/users/:userId', authenticate, c.deleteUser.bind(c))

    return router
  }
}
