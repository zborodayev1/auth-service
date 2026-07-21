import { ClientSession } from '@aggregates/clientSession/ClientSession'
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

  create(params: CreateSessionParams): ClientSession {
    return ClientSession.create(
      this.idGenerator.generate(),
      params.clientId,
      params.expiresAt,
      params.userAgent,
      params.ipAddress,
      params.deviceName,
    )
  }
}
