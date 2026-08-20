import { inject, injectable } from 'inversify'
import { RequestRegisterClientCommand } from './RequestRegisterClientCommand'
import { ClientRepository } from '@aggregates/client/ClientRepository'
import { ConflictError } from '@shared/errors/ConflictError'
import { Email } from '@valueObjects/Email/Email'
import { EmailVerificationService } from '@services/email/EmailVerificationService'
import { PasswordHasher } from '@ports/PasswordHasher'
import { Password } from '@valueObjects/Password/Password'

interface RequestRegisterClientResult {
  success: boolean
}

@injectable()
export class RequestRegisterClientHandler {
  constructor(
    @inject(ClientRepository)
    private readonly clients: ClientRepository,

    @inject(EmailVerificationService)
    private readonly emailVerificationService: EmailVerificationService,

    @inject(PasswordHasher)
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(command: RequestRegisterClientCommand): Promise<RequestRegisterClientResult> {
    const email = Email.create(command.email)

    const exists = await this.clients.findByEmail(email)
    if (exists) {
      throw new ConflictError(`Email already taken`, 'EMAIL_TAKEN', {
        email: email.toString(),
      })
    }

    Password.validateRaw(command.password)

    const passwordHash = await this.passwordHasher.hash(command.password)

    await this.emailVerificationService.createEmailVerificationToken(command.email, {
      name: command.name,
      email: command.email,
      passwordHash: passwordHash,
    })

    return { success: true }
  }
}
