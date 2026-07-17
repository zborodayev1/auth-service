import { Session } from '@aggregates/session/Session'
import { IdGenerator } from '@ports/IdGenerator'
import { inject, injectable } from 'inversify'

interface CreateSessionParams {
  clientId: string
  expiresAt: Date
  userAgent: string | null
  ipAddress: string | null
  deviceName: string | null
}

@injectable()
export class SessionFactory {
  constructor(@inject(IdGenerator) private readonly idGenerator: IdGenerator) {}

  create(params: CreateSessionParams): Session {
    return Session.create(
      this.idGenerator.generate(),
      params.clientId,
      params.expiresAt,
      params.userAgent,
      params.ipAddress,
      params.deviceName,
    )
  }
}
