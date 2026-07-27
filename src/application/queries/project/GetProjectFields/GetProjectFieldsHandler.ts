import { ProjectFieldRepository } from '@aggregates/projectField/ProjectFieldRepository'
import { inject, injectable } from 'inversify'
import { GetProjectFieldsQuery } from './GetProjectFieldsQuery'
import { ProjectField } from '@aggregates/projectField/ProjectField'

@injectable()
export class GetProjectFieldsHandler {
  constructor(
    @inject(ProjectFieldRepository) private readonly projectFields: ProjectFieldRepository,
  ) {}

  async execute(query: GetProjectFieldsQuery): Promise<ProjectField[]> {
    return await this.projectFields.findByProjectId(query.projectId)
  }
}
