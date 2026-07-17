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
import { AuthService } from '@services/auth/AuthService'

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
    private readonly authService: AuthService,
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

    const tokens = await this.authService.login({
      clientId: client.id,
      userAgent: command.userAgent,
      ipAddress: command.ipAddress,
      deviceName: command.deviceName,
    })

    return { clientId: client.id, ...tokens }
  }
}
