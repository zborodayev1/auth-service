import { AggregateRoot } from '@libs/ddd/AggregateRoot'

export class Session extends AggregateRoot {
  private constructor(
    id: string,
    public readonly clientId: string,

    private readonly _refreshTokenHash: string,

    public readonly expiresAt: Date,
    private readonly _revokedAt: Date | null,

    public readonly createdAt: Date,
    public readonly lastUsedAt: Date,

    public readonly userAgent: string | null,
    public readonly ipAddress: string | null,
    public readonly deviceName: string | null,
  ) {
    super(id)
  }

  static create(
    id: string,
    clientId: string,
    refreshTokenHash: string,
    expiresAt: Date,
    userAgent: string | null,
    ipAddress: string | null,
    deviceName: string | null,
  ): Session {
    const now = new Date()

    return new Session(
      id,
      clientId,
      refreshTokenHash,
      expiresAt,
      null,
      now,
      now,
      userAgent,
      ipAddress,
      deviceName,
    )
  }

  static reconstruct(
    id: string,
    clientId: string,
    refreshTokenHash: string,
    expiresAt: Date,
    revokedAt: Date | null,
    createdAt: Date,
    lastUsedAt: Date,
    userAgent: string | null,
    ipAddress: string | null,
    deviceName: string | null,
  ): Session {
    return new Session(
      id,
      clientId,
      refreshTokenHash,
      expiresAt,
      revokedAt,
      createdAt,
      lastUsedAt,
      userAgent,
      ipAddress,
      deviceName,
    )
  }

  get refreshTokenHash(): string {
    return this._refreshTokenHash
  }

  get revokedAt(): Date | null {
    return this._revokedAt
  }

  isExpired(): boolean {
    return this.expiresAt <= new Date()
  }

  isRevoked(): boolean {
    return this._revokedAt !== null
  }

  isActive(): boolean {
    return !this.isExpired() && !this.isRevoked()
  }

  revoke(): Session {
    return new Session(
      this.id,
      this.clientId,
      this._refreshTokenHash,
      this.expiresAt,
      new Date(),
      this.createdAt,
      this.lastUsedAt,
      this.userAgent,
      this.ipAddress,
      this.deviceName,
    )
  }

  touch(): Session {
    return new Session(
      this.id,
      this.clientId,
      this._refreshTokenHash,
      this.expiresAt,
      this._revokedAt,
      this.createdAt,
      new Date(),
      this.userAgent,
      this.ipAddress,
      this.deviceName,
    )
  }
  rotateRefreshToken(newHash: string, expiresAt: Date): Session {
    return new Session(
      this.id,
      this.clientId,
      newHash,
      expiresAt,
      this._revokedAt,
      this.createdAt,
      new Date(),
      this.userAgent,
      this.ipAddress,
      this.deviceName,
    )
  }
}
