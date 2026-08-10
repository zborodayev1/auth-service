import { inject, injectable } from 'inversify'
import { LoginUserCommand } from './LoginUserCommand'
import { Email } from '@valueObjects/Email/Email'
import { UserRepository } from '@aggregates/user/UserRepository'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { PasswordHasher } from '@ports/PasswordHasher'
import { UserAuthService } from '@services/auth/UserAuthService'

interface LoginUserResult {
  userId: string
  accessToken: string
  refreshToken: string
}

@injectable()
export class LoginUserHandler {
  constructor(
    @inject(UserRepository)
    private readonly users: UserRepository,

    @inject(PasswordHasher)
    private readonly passwordHasher: PasswordHasher,

    @inject(UserAuthService)
    private readonly authService: UserAuthService,
  ) {}

  async execute(command: LoginUserCommand): Promise<LoginUserResult> {
    const email = Email.create(command.email)

    const user = await this.users.findByProjectAndEmail(command.projectId, email)
    if (!user) {
      throw new UnauthorizedError('Invalid credentials', 'INVALID_CREDENTIALS')
    }

    const valid = await this.passwordHasher.verify(command.password, user.password.getHash())
    if (!valid) {
      throw new UnauthorizedError('Invalid credentials', 'INVALID_CREDENTIALS')
    }

    const tokens = await this.authService.login({
      userId: user.id,
      projectId: command.projectId,
      deviceName: command.deviceName,
      ipAddress: command.ipAddress,
      userAgent: command.userAgent,
    })

    return {
      userId: user.id,
      ...tokens,
    }
  }
}
