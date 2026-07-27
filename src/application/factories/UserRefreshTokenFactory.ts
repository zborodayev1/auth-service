import { UserRefreshToken } from '@aggregates/userRefreshToken/UserRefreshToken'
import { IdGenerator } from '@ports/IdGenerator'
import type { GeneratedRefreshToken } from '@services/refresh-token/types'
import { injectable, inject } from 'inversify'

interface CreateRefreshToken {
  sessionId: string
  refresh: GeneratedRefreshToken
}

@injectable()
export class UserRefreshTokenFactory {
  constructor(
    @inject(IdGenerator)
    private readonly idGenerator: IdGenerator,
  ) {}
  create(params: CreateRefreshToken): UserRefreshToken {
    return UserRefreshToken.create({
      id: this.idGenerator.generate(),
      sessionId: params.sessionId,
      hash: params.refresh.hash,
      expiresAt: params.refresh.expiresAt,
    })
  }
}
