import { Session } from '@aggregates/session/Session'
import { ServerConfig } from '@config/server'
import { Hasher } from '@ports/Hasher'
import { IdGenerator } from '@ports/IdGenerator'
import { KeyGenerator } from '@ports/KeyGenerator'
import { inject, injectable } from 'inversify'

@injectable()
export class SessionService {
  constructor(
    @inject(ServerConfig) private readonly config: ServerConfig,
    @inject(IdGenerator) private readonly idGenerator: IdGenerator,
    @inject(KeyGenerator) private readonly keyGenerator: KeyGenerator,
    @inject(Hasher) private readonly hasher: Hasher,
  ) {}

  create(
    clientId: string,
    userAgent: string | null,
    ipAddress: string | null,
    deviceName: string | null,
  ): {
    session: Session
    rawRefreshToken: string
  } {
    const refresh = this.generateRefreshToken()

    const session = Session.create(
      this.idGenerator.generate(),
      clientId,
      refresh.hash,
      refresh.expiresAt,
      userAgent,
      ipAddress,
      deviceName,
    )

    return {
      session,
      rawRefreshToken: refresh.rawRefreshToken,
    }
  }

  generateRefreshToken(): {
    rawRefreshToken: string
    hash: string
    expiresAt: Date
  } {
    const rawRefreshToken = this.keyGenerator.generate()

    return {
      rawRefreshToken,
      hash: this.hasher.hash(rawRefreshToken),
      expiresAt: new Date(Date.now() + this.config.refreshTokenTtlMs),
    }
  }
}
