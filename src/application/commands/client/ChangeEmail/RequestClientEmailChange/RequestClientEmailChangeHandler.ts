import { inject, injectable } from 'inversify'
import { RequestClientEmailChangeCommand } from './RequestClientEmailChangeCommand'
import { ClientRepository } from '@aggregates/client/ClientRepository'
import { PasswordHasher } from '@ports/PasswordHasher'
import { ConflictError } from '@shared/errors/ConflictError'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { Email } from '@valueObjects/Email/Email'
import { EmailVerificationService } from '@services/email/EmailVerificationService'

interface RequestClientEmailChangeResult {
  success: true
}

@injectable()
export class RequestClientEmailChangeHandler {
  constructor(
    @inject(ClientRepository)
    private readonly clients: ClientRepository,

    @inject(PasswordHasher)
    private readonly passwordHasher: PasswordHasher,

    @inject(EmailVerificationService)
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  async execute(command: RequestClientEmailChangeCommand): Promise<RequestClientEmailChangeResult> {
    const client = await this.clients.findById(command.clientId)
    if (!client) {
      throw new NotFoundError('Client not found', 'CLIENT_NOT_FOUND', {
        clientId: command.clientId,
      })
    }

    const isPasswordValid = await this.passwordHasher.verify(
      command.password,
      client.password.getHash(),
    )
    if (!isPasswordValid)
      throw new UnauthorizedError('Current password is incorrect', 'INVALID_PASSWORD', {
        clientId: command.clientId,
      })

    const newEmail = Email.create(command.newEmail)

    const exists = await this.clients.findByEmail(newEmail)

    if (exists) {
      throw new ConflictError('Email already taken', 'EMAIL_TAKEN', {
        email: newEmail.toString(),
        clientId: command.clientId,
      })
    }

    await this.emailVerificationService.createEmailVerificationToken(command.newEmail, {
      id: command.clientId,
      email: command.newEmail,
    })

    return {
      success: true,
    }
  }
}
