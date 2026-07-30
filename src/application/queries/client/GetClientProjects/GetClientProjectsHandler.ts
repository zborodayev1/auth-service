import { Project } from '@aggregates/project/Project'
import { ProjectRepository } from '@aggregates/project/ProjectRepository'
import { inject, injectable } from 'inversify'
import { GetClientProjectsQuery } from './GetClientProjectsQuery'

@injectable()
export class GetClientProjectsHandler {
  constructor(@inject(ProjectRepository) private readonly projects: ProjectRepository) {}

  async execute(query: GetClientProjectsQuery): Promise<Project[]> {
    return this.projects.findByOwnerId(query.clientId)
  }
}
