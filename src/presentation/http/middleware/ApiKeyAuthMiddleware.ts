import type { NextFunction, Response, Request } from 'express'
import { inject, injectable } from 'inversify'
import { ProjectApiKeyService } from '@ports/ProjectApiKeyService'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'

@injectable()
export class ApiKeyAuthMiddleware {
  constructor(
    @inject(ProjectApiKeyService)
    private readonly apiKeyService: ProjectApiKeyService,
  ) {}

  async authenticate(req: Request, _: Response, next: NextFunction): Promise<void> {
    const rawKey = req.header('x-api-key')

    if (!rawKey) {
      throw new UnauthorizedError('Missing API key')
    }

    const payload = await this.apiKeyService.verify(rawKey)

    req.projectAuth = payload

    next()
  }
}
