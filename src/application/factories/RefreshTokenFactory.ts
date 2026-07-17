import { RefreshToken } from '@aggregates/refreshToken/RefreshToken'
import { IdGenerator } from '@ports/IdGenerator'
import type { GeneratedRefreshToken } from '@services/refresh-token/types'
import { injectable, inject } from 'inversify'

interface CreateRefreshToken {
  sessionId: string
  refresh: GeneratedRefreshToken
}

@injectable()
export class RefreshTokenFactory {
  constructor(
    @inject(IdGenerator)
    private readonly idGenerator: IdGenerator,
  ) {}
  create(params: CreateRefreshToken): RefreshToken {
    return RefreshToken.create(
      this.idGenerator.generate(),
      params.sessionId,
      params.refresh.hash,
      params.refresh.expiresAt,
    )
  }
}
