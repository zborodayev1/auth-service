import { inject, injectable } from 'inversify'
import { RequestClientForgotPasswordCommand } from './RequestClientForgotPasswordCommand'
import { ClientRepository } from '@aggregates/client/ClientRepository'
import { EmailVerificationService } from '@services/email/EmailVerificationService'
import { Email } from '@valueObjects/Email/Email'

interface RequestClientForgotPasswordResult {
  success: boolean
}

@injectable()
export class RequestClientForgotPasswordHandler {
  constructor(
    @inject(ClientRepository)
    private readonly clients: ClientRepository,

    @inject(EmailVerificationService)
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  async execute(
    command: RequestClientForgotPasswordCommand,
  ): Promise<RequestClientForgotPasswordResult> {
    const email = Email.create(command.email)
    const client = await this.clients.findByEmail(email)

    // no user enumeration — always return success
    if (!client) return { success: true }

    await this.emailVerificationService.createPasswordResetToken(command.email, {
      clientId: client.id,
    })

    return { success: true }
  }
}
