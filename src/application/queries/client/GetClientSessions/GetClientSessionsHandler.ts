import { inject, injectable } from 'inversify'
import { GetClientSessionsQuery } from './GetClientSessionsQuery'
import { ClientSessionRepository } from '@aggregates/clientSession/ClientSessionRepository'

interface ClientSessionDto {
  id: string
  deviceName: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
  isCurrent: boolean
}

@injectable()
export class GetClientSessionsHandler {
  constructor(
    @inject(ClientSessionRepository)
    private readonly sessions: ClientSessionRepository,
  ) {}

  async execute(query: GetClientSessionsQuery): Promise<ClientSessionDto[]> {
    const sessions = await this.sessions.findAllActiveByClientId(query.clientId)

    return sessions.map((s) => ({
      id: s.id,
      deviceName: s.deviceName,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      createdAt: s.createdAt,
      isCurrent: s.id === query.currentSessionId,
    }))
  }
}
