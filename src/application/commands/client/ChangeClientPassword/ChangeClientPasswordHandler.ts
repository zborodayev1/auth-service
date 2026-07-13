import { ClientRepository } from '@aggregates/client/ClientRepository'
import { injectable, inject } from 'inversify'
import { ChangeClientPasswordCommand } from './ChangeClientPasswordCommand'
import { Password } from '@aggregates/client/Password'
import { PasswordHasher } from '@ports/PasswordHasher'
import { ConflictError } from '@shared/errors/ConflictError'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { SessionRepository } from '@aggregates/session/SessionRepository'

@injectable()
export class ChangeClientPasswordHandler {
  constructor(
    @inject(ClientRepository)
    private readonly clients: ClientRepository,

    @inject(PasswordHasher)
    private readonly passwordHasher: PasswordHasher,

    @inject(SessionRepository)
    private readonly sessions: SessionRepository,
  ) {}

  async execute(command: ChangeClientPasswordCommand): Promise<void> {
    Password.validateRaw(command.newPassword)

    if (command.currentPassword === command.newPassword) {
      throw new ConflictError('New password must differ from current', 'PASSWORD_NOT_DIFFERENT', {
        clientId: command.clientId,
      })
    }

    const client = await this.clients.findById(command.clientId)
    if (!client) {
      throw new NotFoundError('Client not found', 'CLIENT_NOT_FOUND', {
        clientId: command.clientId,
      })
    }

    const isCurrentPasswordValid = await this.passwordHasher.verify(
      command.currentPassword,
      client.password.getHash(),
    )

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedError('Current password is incorrect', 'INVALID_PASSWORD', {
        clientId: command.clientId,
      })
    }

    const hash = await this.passwordHasher.hash(command.newPassword)
    const newPassword = Password.fromHash(hash)
    const updated = client.changePassword(newPassword)

    await this.clients.save(updated)
    await this.sessions.revokeAllByClientId(command.clientId)
  }
}
