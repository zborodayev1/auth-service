import { inject, injectable } from 'inversify'
import { GetUserSessionsQuery } from './GetUserSessionsQuery'
import { UserSessionRepository } from '@aggregates/userSession/UserSessionRepository'

interface UserSessionDto {
  id: string
  deviceName: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
  isCurrent: boolean
}

@injectable()
export class GetUserSessionsHandler {
  constructor(
    @inject(UserSessionRepository)
    private readonly sessions: UserSessionRepository,
  ) {}

  async execute(query: GetUserSessionsQuery): Promise<UserSessionDto[]> {
    const sessions = await this.sessions.findAllActiveByUserId(query.userId)

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
