import { ClientRepository } from '@aggregates/client/ClientRepository'
import { injectable, inject } from 'inversify'
import { AdminRegisterClientCommand } from './AdminRegisterClientCommand'
import { Email } from '@valueObjects/Email/Email'
import { Password } from '@valueObjects/Password/Password'
import { Client } from '@aggregates/client/Client'
import { PasswordHasher } from '@ports/PasswordHasher'
import { IdGenerator } from '@ports/IdGenerator'
import { ConflictError } from '@shared/errors/ConflictError'
import { Name } from '@valueObjects/Name/Name'
import { ClientAuthService } from '@services/auth/ClientAuthService'
import { UnitOfWork } from '@ports/UnitOfWork'
import { CONFLICT_ERROR_CODES } from '@shared/errors/ErrorCodes'

export interface AdminRegisterClientResult {
  clientId: string
  accessToken: string
  refreshToken: string
}

@injectable()
export class AdminRegisterClientHandler {
  constructor(
    @inject(ClientRepository)
    private readonly clients: ClientRepository,

    @inject(PasswordHasher)
    private readonly passwordHasher: PasswordHasher,

    @inject(IdGenerator)
    private readonly idGenerator: IdGenerator,

    @inject(ClientAuthService)
    private readonly authService: ClientAuthService,

    @inject(UnitOfWork) private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(command: AdminRegisterClientCommand): Promise<AdminRegisterClientResult> {
    const email = Email.create(command.email)

    const exists = await this.clients.findByEmail(email)
    if (exists) {
      throw new ConflictError(`Email already taken`, CONFLICT_ERROR_CODES.ALREADY_EXISTS, {
        email: email.toString(),
      })
    }

    Password.validateRaw(command.password)

    const hash = await this.passwordHasher.hash(command.password)
    const password = Password.fromHash(hash)

    const id = this.idGenerator.generate()

    const client = Client.create(id, Name.create(command.name), email, password)

    const tokens = await this.unitOfWork.execute(async () => {
      await this.clients.save(client)

      const t = await this.authService.login({
        clientId: client.id,
        userAgent: command.userAgent,
        ipAddress: command.ipAddress,
        deviceName: command.deviceName,
      })

      return t
    })

    return { clientId: client.id, ...tokens }
  }
}
