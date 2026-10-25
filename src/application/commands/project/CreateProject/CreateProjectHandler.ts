import { ProjectRepository } from '@aggregates/project/ProjectRepository'
import { inject, injectable } from 'inversify'
import { CreateProjectCommand } from './CreateProjectCommand'
import { Project } from '@aggregates/project/Project'
import { ApiKeyService } from '@services/apiKey/ApiKeyService'
import { IdGenerator } from '@ports/IdGenerator'
import { Name } from '@valueObjects/Name/Name'
import { KeyGenerator } from '@ports/KeyGenerator'
import { ILogger } from '@ports/logger/ILogger'

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

    @inject(KeyGenerator)
    private readonly keyGenerator: KeyGenerator,

    @inject(ILogger)
    private readonly logger: ILogger,
  ) {}

  async execute(command: CreateProjectCommand): Promise<CreateProjectResult> {
    const id = this.idGenerator.generate()
    const jwtSecret = this.keyGenerator.generate(32, 'hex')

    const { apiKey, rawKey } = this.apiKeyService.create(Name.create(command.name))

    this.logger.info({
      message: 'COMMAND',
      context: { command },
    })

    this.logger.info({
      message: 'OWNER',
      context: { owner: command.ownerId },
    })
    const project = Project.create(
      id,
      Name.create(command.name),
      command.ownerId,
      apiKey,
      jwtSecret,
    )

    this.logger.info({
      message: 'PROJECT OWNER',
      context: { owner: project.ownerId },
    })

    await this.projects.save(project)

    return { projectId: project.id, apiKey: rawKey }
  }
}
