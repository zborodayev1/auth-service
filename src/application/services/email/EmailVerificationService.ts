import { injectable, inject } from 'inversify'
import { createHash, randomBytes } from 'crypto'
import { IEmailService } from '@ports/IEmailService'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { ServerConfig } from '@config/server/server'
import { PendingActionRepository } from '@aggregates/pendingAction/PendingActionRepository'
import { PendingAction, PendingActionContext } from '@aggregates/pendingAction/PendingAction'
import { IdGenerator } from '@ports/IdGenerator'
import { AUTH_ERROR_CODES } from '@shared/errors/ErrorCodes'

@injectable()
export class EmailVerificationService {
  constructor(
    @inject(IEmailService) private readonly emailService: IEmailService,

    @inject(ServerConfig) private readonly config: ServerConfig,

    @inject(PendingActionRepository) private readonly actions: PendingActionRepository,

    @inject(IdGenerator)
    private readonly idGenerator: IdGenerator,
  ) {}

  async createEmailVerificationToken(to: string, context: PendingActionContext): Promise<void> {
    const token = randomBytes(32).toString('hex')
    const tokenHash = this.hashToken(token)

    const action = PendingAction.create(
      this.idGenerator.generate(),
      tokenHash,
      context,
      new Date(Date.now() + this.config.pendingActionTtlMs),
    )

    await this.actions.save(action)

    await this.emailService.sendEmailVerificationEmail(to, token)
  }

  async createPasswordResetToken(to: string, context: PendingActionContext): Promise<void> {
    const token = randomBytes(32).toString('hex')
    const tokenHash = this.hashToken(token)

    const action = PendingAction.create(
      this.idGenerator.generate(),
      tokenHash,
      context,
      new Date(Date.now() + this.config.emailTtlMs),
    )

    await this.actions.save(action)

    await this.emailService.sendPasswordResetEmail(to, token)
  }

  async consumeToken<TContext extends PendingActionContext>(token: string): Promise<TContext> {
    const hash = this.hashToken(token)

    const action = await this.actions.consumeByTokenHash(hash)

    if (!action || action.isExpired()) {
      throw new UnauthorizedError(
        'Invalid or expired code',
        AUTH_ERROR_CODES.INVALID_CREDENTIALS,
        {},
      )
    }

    return action.context as TContext
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }
}
