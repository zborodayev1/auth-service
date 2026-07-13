import { ClientRepository } from '@aggregates/client/ClientRepository'
import { Email } from '@aggregates/client/Email'

import { PasswordHasher } from '@ports/PasswordHasher'
import { AccessTokenService } from '@ports/AccessTokenService'
import { SessionService } from '@app/services/SessionService'
import { inject, injectable } from 'inversify'
import { LoginClientCommand } from './LoginClientCommand'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { SessionRepository } from '@aggregates/session/SessionRepository'

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

    @inject(SessionRepository)
    private readonly sessions: SessionRepository,

    @inject(PasswordHasher)
    private readonly passwordHasher: PasswordHasher,

    @inject(AccessTokenService)
    private readonly tokenService: AccessTokenService,

    @inject(SessionService)
    private readonly sessionService: SessionService,
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

    const { session, rawRefreshToken } = this.sessionService.create(
      client.id,
      command.userAgent,
      command.ipAddress,
      command.deviceName,
    )

    await this.sessions.save(session)

    const accessToken = this.tokenService.sign(client.id, session.id)

    return { clientId: client.id, accessToken, refreshToken: rawRefreshToken }
  }
}
