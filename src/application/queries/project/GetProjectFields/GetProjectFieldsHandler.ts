import { ProjectFieldRepository } from '@aggregates/projectField/ProjectFieldRepository'
import { inject, injectable } from 'inversify'
import { GetProjectFieldsQuery } from './GetProjectFieldsQuery'
import { ProjectField } from '@aggregates/projectField/ProjectField'
import { ProjectAccessService } from '@services/project/ProjectAccessService'

@injectable()
export class GetProjectFieldsHandler {
  constructor(
    @inject(ProjectFieldRepository) private readonly projectFields: ProjectFieldRepository,

    @inject(ProjectAccessService) private readonly accessService: ProjectAccessService,
  ) {}

  async execute(query: GetProjectFieldsQuery): Promise<ProjectField[]> {
    await this.accessService.verifyByProjectId(query.clientId, query.projectId)
    return await this.projectFields.findByProjectId(query.projectId)
  }
}
