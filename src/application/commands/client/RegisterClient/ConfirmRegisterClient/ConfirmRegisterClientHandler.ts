import { inject, injectable } from 'inversify'
import { ConfirmRegisterClientCommand } from './ConfirmRegisterClientCommand'
import { UnitOfWork } from '@ports/UnitOfWork'
import { EmailVerificationService } from '@services/email/EmailVerificationService'
import { PendingActionContext } from '@aggregates/pendingAction/PendingAction'
import { ClientRepository } from '@aggregates/client/ClientRepository'
import { IdGenerator } from '@ports/IdGenerator'
import { ClientAuthService } from '@services/auth/ClientAuthService'
import { ConflictError } from '@shared/errors/ConflictError'
import { Email } from '@valueObjects/Email/Email'
import { Name } from '@valueObjects/Name/Name'
import { Password } from '@valueObjects/Password/Password'
import { Client } from '@aggregates/client/Client'

interface ConfirmRegisterClientResult {
  clientId: string
  accessToken: string
  refreshToken: string
}

interface ConfirmRegisterContext extends PendingActionContext {
  name: string
  email: string
  passwordHash: string
}

@injectable()
export class ConfirmRegisterClientHandler {
  constructor(
    @inject(UnitOfWork)
    private readonly unitOfWork: UnitOfWork,

    @inject(EmailVerificationService)
    private readonly emailVerificationService: EmailVerificationService,

    @inject(ClientRepository)
    private readonly clients: ClientRepository,

    @inject(IdGenerator)
    private readonly idGenerator: IdGenerator,

    @inject(ClientAuthService)
    private readonly authService: ClientAuthService,
  ) {}

  async execute(command: ConfirmRegisterClientCommand): Promise<ConfirmRegisterClientResult> {
    return await this.unitOfWork.execute(async () => {
      const ctx = await this.emailVerificationService.consumeToken<ConfirmRegisterContext>(
        command.token,
      )

      const email = Email.create(ctx.email)

      const exists = await this.clients.findByEmail(email)
      if (exists) {
        throw new ConflictError(`Email already taken`, 'EMAIL_TAKEN', {
          email: email.toString(),
        })
      }

      const password = Password.fromHash(ctx.passwordHash)

      const id = this.idGenerator.generate()

      const client = Client.create(id, Name.create(ctx.name), email, password)

      await this.clients.save(client)

      const tokens = await this.authService.login({
        clientId: client.id,
        userAgent: command.userAgent,
        ipAddress: command.ipAddress,
        deviceName: command.deviceName,
      })

      return { clientId: client.id, ...tokens }
    })
  }
}
