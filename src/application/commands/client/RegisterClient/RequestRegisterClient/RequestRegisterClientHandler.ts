import { inject, injectable } from 'inversify'
import { RequestRegisterClientCommand } from './RequestRegisterClientCommand'
import { ClientRepository } from '@aggregates/client/ClientRepository'
import { Email } from '@valueObjects/Email/Email'
import { EmailVerificationService } from '@services/email/EmailVerificationService'
import { PasswordHasher } from '@ports/PasswordHasher'
import { Password } from '@valueObjects/Password/Password'
import { IEmailService } from '@ports/IEmailService'

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

    @inject(IEmailService) private readonly emailService: IEmailService,
  ) {}

  async execute(command: RequestRegisterClientCommand): Promise<RequestRegisterClientResult> {
    const email = Email.create(command.email)

    const exists = await this.clients.findByEmail(email)
    if (exists) {
      await this.emailService.sendRegistrationAttemptNotice(command.email)
      return { success: true }
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
