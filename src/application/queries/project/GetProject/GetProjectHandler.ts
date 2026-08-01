import { inject, injectable } from 'inversify'
import { GetProjectQuery } from './GetProjectQuery'
import { ProjectFieldRepository } from '@aggregates/projectField/ProjectFieldRepository'
import { ProjectAccessService } from '@services/project/ProjectAccessService'

interface GetProjectResult {
  id: string
  name: string
  createdAt: Date
  fieldCount: number
  apiKey: {
    id: string
    name: string
    revoked: boolean
    createdAt: Date
  }
}

@injectable()
export class GetProjectHandler {
  constructor(
    @inject(ProjectAccessService)
    private readonly accessService: ProjectAccessService,

    @inject(ProjectFieldRepository)
    private readonly projectFields: ProjectFieldRepository,
  ) {}

  async execute(query: GetProjectQuery): Promise<GetProjectResult> {
    const project = await this.accessService.verifyByProjectId(query.clientId, query.projectId)

    const fieldCount = await this.projectFields.countByProjectId(query.projectId)

    return {
      id: project.id,
      name: project.name,
      createdAt: project.createdAt,
      fieldCount: fieldCount,
      apiKey: {
        id: project.apiKey.id,
        name: project.apiKey.name,
        revoked: project.apiKey.revoked,
        createdAt: project.apiKey.createdAt,
      },
    }
  }
}
