import { inject, injectable } from 'inversify'
import { RotateApiKeyCommand } from './RotateApiKeyCommand'
import { ProjectRepository } from '@aggregates/project/ProjectRepository'
import { ApiKeyService } from '@services/ApiKeyService'
import { Name } from '@valueObjects/Name'
import { ProjectAccessService } from '@services/project/ProjectAccessService'

interface RotateApiKeyResult {
  rawKey: string
}

@injectable()
export class RotateApiKeyHandler {
  constructor(
    @inject(ProjectAccessService)
    private readonly accessService: ProjectAccessService,

    @inject(ProjectRepository)
    private readonly projects: ProjectRepository,

    @inject(ApiKeyService)
    private readonly apiKeyService: ApiKeyService,
  ) {}

  async execute(command: RotateApiKeyCommand): Promise<RotateApiKeyResult> {
    const project = await this.accessService.verifyByProjectId(command.clientId, command.projectId)

    const keyName = command.name ?? project.apiKey.name
    const { apiKey, rawKey } = this.apiKeyService.create(Name.create(keyName))

    const updated = project.replaceApiKey(apiKey)
    await this.projects.save(updated)

    return { rawKey }
  }
}
