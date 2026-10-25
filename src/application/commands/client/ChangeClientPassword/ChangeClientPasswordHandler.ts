import { ClientRepository } from '@aggregates/client/ClientRepository'
import { injectable, inject } from 'inversify'
import { ChangeClientPasswordCommand } from './ChangeClientPasswordCommand'
import { Password } from '@valueObjects/Password/Password'
import { PasswordHasher } from '@ports/PasswordHasher'
import { ConflictError } from '@shared/errors/ConflictError'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { ClientSessionRepository } from '@aggregates/clientSession/ClientSessionRepository'
import { UnitOfWork } from '@ports/UnitOfWork'
import {
  AUTH_ERROR_CODES,
  CONFLICT_ERROR_CODES,
  NOT_FOUND_ERROR_CODES,
} from '@shared/errors/ErrorCodes'

interface ChangeClientPasswordResult {
  success: boolean
}

@injectable()
export class ChangeClientPasswordHandler {
  constructor(
    @inject(UnitOfWork) private readonly unitOfWork: UnitOfWork,

    @inject(ClientRepository)
    private readonly clients: ClientRepository,

    @inject(PasswordHasher)
    private readonly passwordHasher: PasswordHasher,

    @inject(ClientSessionRepository)
    private readonly sessions: ClientSessionRepository,
  ) {}

  async execute(command: ChangeClientPasswordCommand): Promise<ChangeClientPasswordResult> {
    Password.validateRaw(command.newPassword)

    const client = await this.clients.findById(command.clientId)
    if (!client) {
      throw new NotFoundError('Client not found', NOT_FOUND_ERROR_CODES.RESOURCE_NOT_FOUND, {
        clientId: command.clientId,
      })
    }

    const isCurrentPasswordValid = await this.passwordHasher.verify(
      command.currentPassword,
      client.password.getHash(),
    )

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedError(
        'Current password is incorrect',
        AUTH_ERROR_CODES.INVALID_CREDENTIALS,
        {
          clientId: command.clientId,
        },
      )
    }

    if (command.currentPassword === command.newPassword) {
      throw new ConflictError(
        'New password must differ from current',
        CONFLICT_ERROR_CODES.PRECONDITION_FAILED,
        {
          clientId: command.clientId,
        },
      )
    }

    const hash = await this.passwordHasher.hash(command.newPassword)
    const newPassword = Password.fromHash(hash)
    const updated = client.changePassword(newPassword)

    await this.unitOfWork.execute(async () => {
      await this.clients.save(updated)
      await this.sessions.revokeAllByClientId(command.clientId)
    })

    return { success: true }
  }
}
