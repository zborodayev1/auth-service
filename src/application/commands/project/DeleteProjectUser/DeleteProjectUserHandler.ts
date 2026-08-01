import { inject, injectable } from 'inversify'
import { DeleteProjectUserCommand } from './DeleteProjectUserCommand'
import { UserRepository } from '@aggregates/user/UserRepository'
import { UserFieldValueRepository } from '@aggregates/userFieldValue/UserFieldValueRepository'
import { UserRefreshTokenRepository } from '@aggregates/userRefreshToken/UserRefreshTokenRepository'
import { UserSessionRepository } from '@aggregates/userSession/UserSessionRepository'
import { UnitOfWork } from '@ports/UnitOfWork'
import { ProjectAccessService } from '@services/project/ProjectAccessService'

interface DeleteProjectUserResult {
  success: boolean
}

@injectable()
export class DeleteProjectUserHandler {
  constructor(
    @inject(UserRepository)
    private readonly users: UserRepository,

    @inject(UserFieldValueRepository)
    private readonly fields: UserFieldValueRepository,

    @inject(UserSessionRepository)
    private readonly sessions: UserSessionRepository,

    @inject(UserRefreshTokenRepository)
    private readonly refreshTokens: UserRefreshTokenRepository,

    @inject(UnitOfWork) private readonly unitOfWork: UnitOfWork,

    @inject(ProjectAccessService)
    private readonly accessService: ProjectAccessService,
  ) {}

  async execute(command: DeleteProjectUserCommand): Promise<DeleteProjectUserResult> {
    await this.accessService.verifyByUserId(command.clientId, command.userId)

    await this.unitOfWork.execute(async () => {
      await this.refreshTokens.deleteByUserId(command.userId)
      await this.sessions.deleteByUserId(command.userId)
      await this.fields.deleteByUserId(command.userId)
      await this.users.delete(command.userId)
    })
    return {
      success: true,
    }
  }
}
