import { inject, injectable } from 'inversify'
import { ConfirmClientEmailChangeCommand } from './ConfirmClientEmailChangeCommand'
import { ClientRepository } from '@aggregates/client/ClientRepository'
import { EmailVerificationService } from '@services/email/EmailVerificationService'
import { ConflictError } from '@shared/errors/ConflictError'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { Email } from '@valueObjects/Email/Email'
import { PendingActionContext } from '@aggregates/pendingAction/PendingAction'
import { UnitOfWork } from '@ports/UnitOfWork'

interface ConfirmClientEmailChangeResult {
  newEmail: string
}

interface EmailChangeContext extends PendingActionContext {
  id: string
  email: string
}

@injectable()
export class ConfirmClientEmailChangeHandler {
  constructor(
    @inject(ClientRepository)
    private readonly clients: ClientRepository,

    @inject(EmailVerificationService)
    private readonly emailVerificationService: EmailVerificationService,

    @inject(UnitOfWork)
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(command: ConfirmClientEmailChangeCommand): Promise<ConfirmClientEmailChangeResult> {
    return this.unitOfWork.execute(async () => {
      const ctx = await this.emailVerificationService.consumeToken<EmailChangeContext>(
        command.token,
      )

      const client = await this.clients.findById(ctx.id)

      if (!client) {
        throw new NotFoundError('Client not found', 'CLIENT_NOT_FOUND', {
          clientId: ctx.id,
        })
      }

      const newEmail = Email.create(ctx.email)

      const exists = await this.clients.findByEmail(newEmail)

      if (exists && exists.id !== client.id) {
        throw new ConflictError('Email already taken', 'EMAIL_TAKEN', {
          email: newEmail.toString(),
          clientId: ctx.id,
        })
      }

      const updated = client.changeEmail(newEmail)

      await this.clients.save(updated)

      return {
        newEmail: ctx.email,
      }
    })
  }
}
