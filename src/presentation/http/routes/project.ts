import { Router } from 'express'
import { injectable } from 'inversify'
import { ProjectController } from '../controllers/ProjectController'
import { ClientAuthMiddleware } from '../middleware/ClientAuthMiddleware'

@injectable()
export class ProjectRouter {
  constructor(
    private readonly controller: ProjectController,
    private readonly auth: ClientAuthMiddleware,
  ) {}

  build(): Router {
    const router = Router({ mergeParams: true })
    const authenticate = this.auth.authenticate.bind(this.auth)
    const c = this.controller

    router.post('/', authenticate, c.create.bind(c))

    router.get('/:projectId/fields', authenticate, c.getFields.bind(c))
    router.post('/:projectId/fields', authenticate, c.addField.bind(c))
    router.patch('/:projectId/fields/:fieldId', authenticate, c.updateField.bind(c))
    router.delete('/:projectId/fields/:fieldId', authenticate, c.deleteField.bind(c))

    return router
  }
}
