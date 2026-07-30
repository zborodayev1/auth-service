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
export class ClientSessionFactory {
  constructor(@inject(IdGenerator) private readonly idGenerator: IdGenerator) {}

  create(params: CreateSessionParams): ClientSession {
    return ClientSession.create({
      id: this.idGenerator.generate(),
      clientId: params.clientId,
      expiresAt: params.expiresAt,
      userAgent: params.userAgent,
      ipAddress: params.ipAddress,
      deviceName: params.deviceName,
    })
  }
}
