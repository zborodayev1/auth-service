import { ClientRepository } from '@aggregates/client/ClientRepository'
import { inject, injectable } from 'inversify'
import { ChangeClientEmailCommand } from './ChangeClientEmailCommand'
import { Email } from '@aggregates/client/Email'
import { PasswordHasher } from '@ports/PasswordHasher'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { ConflictError } from '@shared/errors/ConflictError'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'

interface ChangeClientEmailResult {
  message: string
}

@injectable()
export class ChangeClientEmailHandler {
  constructor(
    @inject(ClientRepository)
    private readonly clients: ClientRepository,

    @inject(PasswordHasher)
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(command: ChangeClientEmailCommand): Promise<ChangeClientEmailResult> {
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

    const updated = client.changeEmail(newEmail)
    await this.clients.save(updated)

    return { message: 'Email changed successfully' }
  }
}
