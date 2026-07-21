import { AggregateRoot } from '@libs/ddd/AggregateRoot'

export class UserSession extends AggregateRoot {
  private constructor(
    id: string,
    public readonly userId: string,

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
    userId: string,
    expiresAt: Date,
    userAgent: string | null,
    ipAddress: string | null,
    deviceName: string | null,
  ): UserSession {
    const now = new Date()
    return new UserSession(id, userId, expiresAt, null, now, now, userAgent, ipAddress, deviceName)
  }

  static reconstruct(
    id: string,
    userId: string,
    expiresAt: Date,
    revokedAt: Date | null,
    createdAt: Date,
    lastUsedAt: Date,
    userAgent: string | null,
    ipAddress: string | null,
    deviceName: string | null,
  ): UserSession {
    return new UserSession(
      id,
      userId,
      expiresAt,
      revokedAt,
      createdAt,
      lastUsedAt,
      userAgent,
      ipAddress,
      deviceName,
    )
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

  revoke(): UserSession {
    return new UserSession(
      this.id,
      this.userId,
      this.expiresAt,
      new Date(),
      this.createdAt,
      this.lastUsedAt,
      this.userAgent,
      this.ipAddress,
      this.deviceName,
    )
  }

  touch(): UserSession {
    return new UserSession(
      this.id,
      this.userId,
      this.expiresAt,
      this._revokedAt,
      this.createdAt,
      new Date(),
      this.userAgent,
      this.ipAddress,
      this.deviceName,
    )
  }
}
