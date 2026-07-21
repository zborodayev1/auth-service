import { ClientRefreshToken } from '@aggregates/clientRefreshToken/RefreshToken'
import { IdGenerator } from '@ports/IdGenerator'
import type { GeneratedRefreshToken } from '@services/refresh-token/types'
import { injectable, inject } from 'inversify'

interface CreateRefreshToken {
  sessionId: string
  refresh: GeneratedRefreshToken
}

@injectable()
export class ClientRefreshTokenFactory {
  constructor(
    @inject(IdGenerator)
    private readonly idGenerator: IdGenerator,
  ) {}
  create(params: CreateRefreshToken): ClientRefreshToken {
    return ClientRefreshToken.create(
      this.idGenerator.generate(),
      params.sessionId,
      params.refresh.hash,
      params.refresh.expiresAt,
    )
  }
}
