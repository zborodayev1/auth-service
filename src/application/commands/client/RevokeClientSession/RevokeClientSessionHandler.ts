import { inject, injectable } from 'inversify'
import { ClientSessionRepository } from '@aggregates/clientSession/ClientSessionRepository'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { ValidationError } from '@shared/errors/ValidationError'
import { RevokeClientSessionCommand } from './RevokeClientSessionCommand'
import { NOT_FOUND_ERROR_CODES, VALIDATION_ERROR_CODES } from '@shared/errors/ErrorCodes'

interface RevokeClientSessionResult {
  success: boolean
}

@injectable()
export class RevokeClientSessionHandler {
  constructor(
    @inject(ClientSessionRepository)
    private readonly sessions: ClientSessionRepository,
  ) {}

  async execute(command: RevokeClientSessionCommand): Promise<RevokeClientSessionResult> {
    if (command.sessionId === command.currentSessionId) {
      throw new ValidationError(
        'Cannot revoke current session via this endpoint. Use /logout instead.',
        VALIDATION_ERROR_CODES.INVALID_INPUT,
      )
    }

    const session = await this.sessions.findByIdAndClientId(command.sessionId, command.clientId)

    if (!session?.isActive()) {
      throw new NotFoundError('Session not found', NOT_FOUND_ERROR_CODES.RESOURCE_NOT_FOUND, {
        sessionId: command.sessionId,
      })
    }

    await this.sessions.save(session.revoke())

    return { success: true }
  }
}
