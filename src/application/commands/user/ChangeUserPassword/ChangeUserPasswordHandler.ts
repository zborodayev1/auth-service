import { inject, injectable } from 'inversify'
import { ChangeUserPasswordCommand } from './ChangeUserPasswordCommand'
import { UserRepository } from '@aggregates/user/UserRepository'
import { PasswordHasher } from '@ports/PasswordHasher'
import { UnitOfWork } from '@ports/UnitOfWork'
import { Password } from '@valueObjects/Password/Password'
import { ConflictError } from '@shared/errors/ConflictError'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { UserSessionRepository } from '@aggregates/userSession/UserSessionRepository'

interface ChangeUserPasswordResult {
  success: boolean
}

@injectable()
export class ChangeUserPasswordHandler {
  constructor(
    @inject(UnitOfWork) private readonly unitOfWork: UnitOfWork,

    @inject(PasswordHasher)
    private readonly passwordHasher: PasswordHasher,

    @inject(UserRepository)
    private readonly users: UserRepository,

    @inject(UserSessionRepository)
    private readonly sessions: UserSessionRepository,
  ) {}

  async execute(command: ChangeUserPasswordCommand): Promise<ChangeUserPasswordResult> {
    Password.validateRaw(command.newPassword)

    if (command.currentPassword === command.newPassword) {
      throw new ConflictError('New password must differ from current', 'PASSWORD_NOT_DIFFERENT', {
        userId: command.userId,
        projectId: command.projectId,
      })
    }

    const user = await this.users.findById(command.userId)
    if (user?.projectId !== command.projectId)
      throw new NotFoundError('User not found', 'USER_NOT_FOUND', {
        userId: command.userId,
        projectId: command.projectId,
      })

    const isCurrentPasswordValid = await this.passwordHasher.verify(
      command.currentPassword,
      user.password.getHash(),
    )

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedError('Current password is incorrect', 'INVALID_PASSWORD', {
        userId: command.userId,
        projectId: command.projectId,
      })
    }

    const hash = await this.passwordHasher.hash(command.newPassword)
    const newPassword = Password.fromHash(hash)
    const updated = user.changePassword(newPassword)

    await this.unitOfWork.execute(async () => {
      await this.users.save(updated)
      await this.sessions.revokeAllByUserId(command.userId)
    })

    return {
      success: true,
    }
  }
}
