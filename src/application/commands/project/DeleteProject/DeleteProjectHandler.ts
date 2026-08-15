import { inject, injectable } from 'inversify'
import { DeleteProjectCommand } from './DeleteProjectCommand'
import { ProjectAccessService } from '@services/project/ProjectAccessService'
import { UnitOfWork } from '@ports/UnitOfWork'
import { UserRepository } from '@aggregates/user/UserRepository'
import { UserFieldValueRepository } from '@aggregates/userFieldValue/UserFieldValueRepository'
import { UserRefreshTokenRepository } from '@aggregates/userRefreshToken/UserRefreshTokenRepository'
import { UserSessionRepository } from '@aggregates/userSession/UserSessionRepository'
import { ProjectFieldRepository } from '@aggregates/projectField/ProjectFieldRepository'
import { ProjectRepository } from '@aggregates/project/ProjectRepository'
import { SchemaBuilderService } from '@services/schema/SchemaBuilderService'

interface DeleteProjectResult {
  success: boolean
}

@injectable()
export class DeleteProjectHandler {
  constructor(
    @inject(ProjectAccessService)
    private readonly accessService: ProjectAccessService,

    @inject(UserRepository)
    private readonly users: UserRepository,

    @inject(UserFieldValueRepository)
    private readonly userFields: UserFieldValueRepository,

    @inject(UserSessionRepository)
    private readonly sessions: UserSessionRepository,

    @inject(UserRefreshTokenRepository)
    private readonly refreshTokens: UserRefreshTokenRepository,

    @inject(ProjectFieldRepository)
    private readonly projectFields: ProjectFieldRepository,

    @inject(ProjectRepository)
    private readonly projects: ProjectRepository,

    @inject(UnitOfWork)
    private readonly unitOfWork: UnitOfWork,

    @inject(SchemaBuilderService) private readonly schemaBuilder: SchemaBuilderService,
  ) {}

  async execute(command: DeleteProjectCommand): Promise<DeleteProjectResult> {
    await this.accessService.verifyByProjectId(command.clientId, command.projectId)

    await this.unitOfWork.execute(async () => {
      await this.refreshTokens.deleteByProjectId(command.projectId)
      await this.sessions.deleteByProjectId(command.projectId)
      await this.userFields.deleteByProjectId(command.projectId)
      await this.users.deleteByProjectId(command.projectId)
      await this.projectFields.deleteByProjectId(command.projectId)
      await this.projects.deleteApiKey(command.projectId)
      await this.projects.delete(command.projectId)
    })

    await this.schemaBuilder.invalidate(command.projectId)

    return { success: true }
  }
}
