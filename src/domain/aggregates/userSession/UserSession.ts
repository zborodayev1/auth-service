import { AggregateRoot } from '@libs/ddd/AggregateRoot'

export class UserSession extends AggregateRoot {
  private constructor(
    id: string,
    public readonly userId: string,
    public readonly projectId: string,

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

  static create(params: {
    id: string
    userId: string
    projectId: string
    expiresAt: Date
    userAgent: string | null
    ipAddress: string | null
    deviceName: string | null
  }): UserSession {
    const now = new Date()
    return new UserSession(
      params.id,
      params.userId,
      params.projectId,
      params.expiresAt,
      null,
      now,
      now,
      params.userAgent,
      params.ipAddress,
      params.deviceName,
    )
  }

  static reconstruct(
    id: string,
    userId: string,
    projectId: string,
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
      projectId,
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
      this.projectId,
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
      this.projectId,
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
