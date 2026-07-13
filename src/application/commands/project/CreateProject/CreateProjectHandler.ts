import { ProjectRepository } from '@aggregates/project/ProjectRepository'
import { inject, injectable } from 'inversify'
import { CreateProjectCommand } from './CreateProjectCommand'
import { Project } from '@aggregates/project/Project'
import { ApiKeyService } from '@app/services/ApiKeyService'
import { IdGenerator } from '@ports/IdGenerator'
import { Name } from '@valueObjects/Name'

export interface CreateProjectResult {
  projectId: string
  apiKey: string
}

@injectable()
export class CreateProjectHandler {
  constructor(
    @inject(ProjectRepository)
    private readonly projects: ProjectRepository,

    @inject(ApiKeyService)
    private readonly apiKeyService: ApiKeyService,

    @inject(IdGenerator)
    private readonly idGenerator: IdGenerator,
  ) {}

  async execute(command: CreateProjectCommand): Promise<CreateProjectResult> {
    const id = this.idGenerator.generate()

    const { apiKey, rawKey } = this.apiKeyService.create(Name.create(command.name))

    const project = Project.create(id, Name.create(command.name), command.ownerId, apiKey)

    await this.projects.save(project)

    return { projectId: project.id, apiKey: rawKey }
  }
}
