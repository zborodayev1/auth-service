import { inject, injectable } from 'inversify'
import { RenameApiKeyCommand } from './RenameApiKeyCommand'
import { ProjectRepository } from '@aggregates/project/ProjectRepository'
import { Name } from '@valueObjects/Name'
import { ProjectAccessService } from '@services/project/ProjectAccessService'

interface RenameApiKeyResult {
  id: string
  name: string
}

@injectable()
export class RenameApiKeyHandler {
  constructor(
    @inject(ProjectAccessService)
    private readonly accessService: ProjectAccessService,

    @inject(ProjectRepository)
    private readonly projects: ProjectRepository,
  ) {}

  async execute(command: RenameApiKeyCommand): Promise<RenameApiKeyResult> {
    const project = await this.accessService.verifyByProjectId(command.clientId, command.projectId)

    const updated = project.reNameApiKey(Name.create(command.name))
    await this.projects.save(updated)

    return { id: updated.apiKey.id, name: updated.apiKey.name }
  }
}
