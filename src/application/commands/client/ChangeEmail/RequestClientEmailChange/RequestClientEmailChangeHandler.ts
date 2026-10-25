import { inject, injectable } from 'inversify'
import { RequestClientEmailChangeCommand } from './RequestClientEmailChangeCommand'
import { ClientRepository } from '@aggregates/client/ClientRepository'
import { PasswordHasher } from '@ports/PasswordHasher'
import { ConflictError } from '@shared/errors/ConflictError'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { Email } from '@valueObjects/Email/Email'
import { EmailVerificationService } from '@services/email/EmailVerificationService'
import {
  AUTH_ERROR_CODES,
  CONFLICT_ERROR_CODES,
  NOT_FOUND_ERROR_CODES,
} from '@shared/errors/ErrorCodes'

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
      throw new NotFoundError('Client not found', NOT_FOUND_ERROR_CODES.RESOURCE_NOT_FOUND, {
        clientId: command.clientId,
      })
    }

    const isPasswordValid = await this.passwordHasher.verify(
      command.password,
      client.password.getHash(),
    )
    if (!isPasswordValid)
      throw new UnauthorizedError(
        'Current password is incorrect',
        AUTH_ERROR_CODES.INVALID_CREDENTIALS,
        {
          clientId: command.clientId,
        },
      )

    const newEmail = Email.create(command.newEmail)

    const exists = await this.clients.findByEmail(newEmail)

    if (exists) {
      throw new ConflictError('Email already taken', CONFLICT_ERROR_CODES.ALREADY_EXISTS, {
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
