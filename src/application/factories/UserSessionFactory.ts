import { UserSession } from '@aggregates/userSession/UserSession'
import { IdGenerator } from '@ports/IdGenerator'
import { inject, injectable } from 'inversify'

interface CreateSessionParams {
  userId: string
  projectId: string
  expiresAt: Date
  userAgent: string | null
  ipAddress: string | null
  deviceName: string | null
}

@injectable()
export class UserSessionFactory {
  constructor(@inject(IdGenerator) private readonly idGenerator: IdGenerator) {}

  create(params: CreateSessionParams): UserSession {
    return UserSession.create({
      id: this.idGenerator.generate(),
      userId: params.userId,
      projectId: params.projectId,
      expiresAt: params.expiresAt,
      userAgent: params.userAgent,
      ipAddress: params.ipAddress,
      deviceName: params.deviceName,
    })
  }
}
