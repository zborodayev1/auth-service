import { inject, injectable } from 'inversify'
import { ChangeUserEmailCommand } from './ChangeUserEmailCommand'
import { PasswordHasher } from '@ports/PasswordHasher'
import { UserRepository } from '@aggregates/user/UserRepository'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { Email } from '@valueObjects/Email/Email'
import { ConflictError } from '@shared/errors/ConflictError'

interface ChangeUserEmailResult {
  email: string
}

@injectable()
export class ChangeUserEmailHandler {
  constructor(
    @inject(UserRepository)
    private readonly users: UserRepository,

    @inject(PasswordHasher)
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(command: ChangeUserEmailCommand): Promise<ChangeUserEmailResult> {
    const user = await this.users.findById(command.userId)
    if (!user)
      throw new NotFoundError('User not found', 'USER_NOT_FOUND', {
        userId: command.userId,
        projectId: command.projectId,
      })

    const isPasswordValid = await this.passwordHasher.verify(
      command.password,
      user.password.getHash(),
    )

    if (!isPasswordValid) {
      throw new UnauthorizedError('Current password is incorrect', 'INVALID_PASSWORD', {
        userId: command.userId,
        projectId: command.projectId,
      })
    }
    const newEmail = Email.create(command.newEmail)

    const exists = await this.users.findByProjectAndEmail(command.projectId, newEmail)
    if (exists) {
      throw new ConflictError('Email already taken', 'EMAIL_TAKEN', {
        email: newEmail.toString(),
        userId: command.userId,
        projectId: command.projectId,
      })
    }
    const updated = user.changeEmail(newEmail)
    await this.users.save(updated)

    return { email: command.newEmail }
  }
}
