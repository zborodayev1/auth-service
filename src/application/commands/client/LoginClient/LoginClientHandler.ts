import { ClientRepository } from '@aggregates/client/ClientRepository'
import { Email } from '@aggregates/client/Email'
import { PasswordHasher } from '@ports/PasswordHasher'
import { inject, injectable } from 'inversify'
import { LoginClientCommand } from './LoginClientCommand'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { AuthService } from '@services/auth/AuthService'

interface LoginClientResult {
  clientId: string
  accessToken: string
  refreshToken: string
}

@injectable()
export class LoginClientHandler {
  constructor(
    @inject(ClientRepository)
    private readonly clients: ClientRepository,

    @inject(PasswordHasher)
    private readonly passwordHasher: PasswordHasher,

    @inject(AuthService)
    private readonly authService: AuthService,
  ) {}

  async execute(command: LoginClientCommand): Promise<LoginClientResult> {
    const email = Email.create(command.email)

    const client = await this.clients.findByEmail(email)
    if (!client) {
      throw new UnauthorizedError('Invalid credentials', 'INVALID_CREDENTIALS')
    }

    const valid = await this.passwordHasher.verify(command.password, client.password.getHash())
    if (!valid) {
      throw new UnauthorizedError('Invalid credentials', 'INVALID_CREDENTIALS')
    }

    const tokens = await this.authService.login({
      clientId: client.id,
      deviceName: command.deviceName,
      ipAddress: command.ipAddress,
      userAgent: command.userAgent,
    })

    return {
      clientId: client.id,
      ...tokens,
    }
  }
}
