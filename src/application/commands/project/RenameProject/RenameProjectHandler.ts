import { inject, injectable } from 'inversify'
import { RenameProjectCommand } from './RenameProjectCommand'
import { ProjectRepository } from '@aggregates/project/ProjectRepository'
import { ConflictError } from '@shared/errors/ConflictError'
import { Name } from '@valueObjects/Name/Name'
import { ProjectAccessService } from '@services/project/ProjectAccessService'
import { CONFLICT_ERROR_CODES } from '@shared/errors/ErrorCodes'

interface RenameProjectResult {
  projectId: string
  name: string
}

@injectable()
export class RenameProjectHandler {
  constructor(
    @inject(ProjectAccessService)
    private readonly accessService: ProjectAccessService,

    @inject(ProjectRepository)
    private readonly projects: ProjectRepository,
  ) {}

  async execute(command: RenameProjectCommand): Promise<RenameProjectResult> {
    const project = await this.accessService.verifyByProjectId(command.clientId, command.projectId)

    const newName = Name.create(command.name)

    const exists = await this.projects.findByOwnerAndName(command.clientId, newName)
    if (exists && exists.id !== command.projectId)
      throw new ConflictError('Project name already taken', CONFLICT_ERROR_CODES.ALREADY_EXISTS, {
        command,
      })

    const updated = project.reName(newName)
    await this.projects.save(updated)

    return { projectId: updated.id, name: updated.name }
  }
}
