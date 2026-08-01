import { inject, injectable } from 'inversify'
import { GetProjectApiKeyQuery } from './GetProjectApiKeyQuery'
import { ProjectAccessService } from '@services/project/ProjectAccessService'

interface GetProjectApiKeyResult {
  id: string
  name: string
  revoked: boolean
  createdAt: Date
}

@injectable()
export class GetProjectApiKeyHandler {
  constructor(
    @inject(ProjectAccessService)
    private readonly accessService: ProjectAccessService,
  ) {}

  async execute(query: GetProjectApiKeyQuery): Promise<GetProjectApiKeyResult> {
    const project = await this.accessService.verifyByProjectId(query.clientId, query.projectId)

    const apiKey = project.apiKey

    return {
      id: apiKey.id,
      name: apiKey.name,
      revoked: apiKey.revoked,
      createdAt: apiKey.createdAt,
    }
  }
}
