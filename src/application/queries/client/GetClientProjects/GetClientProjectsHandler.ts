import { ProjectRepository } from '@aggregates/project/ProjectRepository'
import { inject, injectable } from 'inversify'
import { GetClientProjectsQuery } from './GetClientProjectsQuery'

interface GetClientProjectsResult {
  id: string
  name: string
  createdAt: Date
  apiKey: {
    id: string
    name: string
    revoked: boolean
    createdAt: Date
  }
}

@injectable()
export class GetClientProjectsHandler {
  constructor(@inject(ProjectRepository) private readonly projects: ProjectRepository) {}

  async execute(query: GetClientProjectsQuery): Promise<GetClientProjectsResult[]> {
    const projects = await this.projects.findByOwnerId(query.clientId)

    return projects.map((p) => ({
      id: p.id,
      name: p.name,
      createdAt: p.createdAt,
      apiKey: {
        id: p.apiKey.id,
        name: p.apiKey.name,
        revoked: p.apiKey.revoked,
        createdAt: p.apiKey.createdAt,
      },
    }))
  }
}
