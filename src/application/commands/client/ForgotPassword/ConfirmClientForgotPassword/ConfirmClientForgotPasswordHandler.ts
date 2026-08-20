import { inject, injectable } from 'inversify'
import { ConfirmClientForgotPasswordCommand } from './ConfirmClientForgotPasswordCommand'
import { ClientRepository } from '@aggregates/client/ClientRepository'
import { ClientSessionRepository } from '@aggregates/clientSession/ClientSessionRepository'
import { EmailVerificationService } from '@services/email/EmailVerificationService'
import { UnitOfWork } from '@ports/UnitOfWork'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { ClientAuthService } from '@services/auth/ClientAuthService'
import { TokenPair } from '@services/auth/types'
import { PendingActionContext } from '@aggregates/pendingAction/PendingAction'

interface ForgotPasswordContext extends PendingActionContext {
  clientId: string
}

@injectable()
export class ConfirmClientForgotPasswordHandler {
  constructor(
    @inject(UnitOfWork)
    private readonly unitOfWork: UnitOfWork,

    @inject(ClientRepository)
    private readonly clients: ClientRepository,

    @inject(ClientSessionRepository)
    private readonly sessions: ClientSessionRepository,

    @inject(EmailVerificationService)
    private readonly emailVerificationService: EmailVerificationService,

    @inject(ClientAuthService)
    private readonly authService: ClientAuthService,
  ) {}

  async execute(command: ConfirmClientForgotPasswordCommand): Promise<TokenPair> {
    return await this.unitOfWork.execute(async () => {
      const ctx = await this.emailVerificationService.consumeToken<ForgotPasswordContext>(
        command.token,
      )

      const client = await this.clients.findById(ctx.clientId)
      if (!client)
        throw new NotFoundError('Client not found', 'CLIENT_NOT_FOUND', { clientId: ctx.clientId })

      await this.sessions.revokeAllByClientId(ctx.clientId)
      return this.authService.login({
        clientId: ctx.clientId,
        userAgent: command.userAgent,
        ipAddress: command.ipAddress,
        deviceName: command.deviceName,
      })
    })
  }
}
