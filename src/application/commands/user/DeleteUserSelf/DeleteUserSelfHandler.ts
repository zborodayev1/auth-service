import { inject, injectable } from 'inversify'
import { DeleteUserSelfCommand } from './DeleteUserSelfCommand'
import { UserRepository } from '@aggregates/user/UserRepository'
import { UserFieldValueRepository } from '@aggregates/userFieldValue/UserFieldValueRepository'
import { UserSessionRepository } from '@aggregates/userSession/UserSessionRepository'
import { UserRefreshTokenRepository } from '@aggregates/userRefreshToken/UserRefreshTokenRepository'
import { PasswordHasher } from '@ports/PasswordHasher'
import { UnitOfWork } from '@ports/UnitOfWork'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'

interface DeleteUserSelfResult {
  success: boolean
}

@injectable()
export class DeleteUserSelfHandler {
  constructor(
    @inject(UserRepository)
    private readonly users: UserRepository,

    @inject(UserFieldValueRepository)
    private readonly fields: UserFieldValueRepository,

    @inject(UserSessionRepository)
    private readonly sessions: UserSessionRepository,

    @inject(UserRefreshTokenRepository)
    private readonly refreshTokens: UserRefreshTokenRepository,

    @inject(PasswordHasher)
    private readonly passwordHasher: PasswordHasher,
    @inject(UnitOfWork) private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(command: DeleteUserSelfCommand): Promise<DeleteUserSelfResult> {
    const user = await this.users.findById(command.userId)
    if (user?.projectId !== command.projectId) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND', {
        userId: command.userId,
        projectId: command.projectId,
      })
    }

    const isPasswordValid = await this.passwordHasher.verify(
      command.password,
      user.password.getHash(),
    )
    if (!isPasswordValid) {
      throw new UnauthorizedError('Current password is incorrect', 'INVALID_PASSWORD', {
        userId: command.userId,
      })
    }

    await this.unitOfWork.execute(async () => {
      await this.refreshTokens.deleteByUserId(command.userId)
      await this.sessions.deleteByUserId(command.userId)
      await this.fields.deleteByUserId(command.userId)
      await this.users.delete(command.userId)
    })

    return { success: true }
  }
}
