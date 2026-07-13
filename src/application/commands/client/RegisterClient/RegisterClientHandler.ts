import { ClientRepository } from '@aggregates/client/ClientRepository'
import { injectable, inject } from 'inversify'
import { RegisterClientCommand } from './RegisterClientCommand'
import { Email } from '@aggregates/client/Email'
import { Password } from '@aggregates/client/Password'
import { Client } from '@aggregates/client/Client'
import { PasswordHasher } from '@ports/PasswordHasher'
import { IdGenerator } from '@ports/IdGenerator'
import { ConflictError } from '@shared/errors/ConflictError'
import { Name } from '@valueObjects/Name'
import { AccessTokenService } from '@ports/AccessTokenService'
import { SessionService } from '@app/services/SessionService'
import { SessionRepository } from '@aggregates/session/SessionRepository'

interface RegisterClientResult {
  clientId: string
  accessToken: string
  refreshToken: string
}

@injectable()
export class RegisterClientHandler {
  constructor(
    @inject(ClientRepository)
    private readonly clients: ClientRepository,

    @inject(PasswordHasher)
    private readonly passwordHasher: PasswordHasher,

    @inject(IdGenerator)
    private readonly idGenerator: IdGenerator,

    @inject(AccessTokenService)
    private readonly tokenService: AccessTokenService,

    @inject(SessionService)
    private readonly sessionService: SessionService,

    @inject(SessionRepository)
    private readonly sessions: SessionRepository,
  ) {}

  async execute(command: RegisterClientCommand): Promise<RegisterClientResult> {
    const email = Email.create(command.email)

    const exists = await this.clients.findByEmail(email)
    if (exists) {
      throw new ConflictError(`Email already taken`, 'EMAIL_TAKEN', {
        email: email.toString(),
      })
    }

    Password.validateRaw(command.password)

    const hash = await this.passwordHasher.hash(command.password)
    const password = Password.fromHash(hash)

    const id = this.idGenerator.generate()

    const client = Client.create(id, Name.create(command.name), email, password)

    await this.clients.save(client)

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
