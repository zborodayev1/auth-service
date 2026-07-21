import { AggregateRoot } from '@libs/ddd/AggregateRoot'

export class ClientRefreshToken extends AggregateRoot {
  private constructor(
    id: string,

    public readonly sessionId: string,

    private readonly _hash: string,

    private readonly _usedAt: Date | null,
    private readonly _revokedAt: Date | null,

    public readonly expiresAt: Date,
    public readonly createdAt: Date,
  ) {
    super(id)
  }

  static create(id: string, sessionId: string, hash: string, expiresAt: Date): ClientRefreshToken {
    return new ClientRefreshToken(id, sessionId, hash, null, null, expiresAt, new Date())
  }

  static reconstruct(
    id: string,
    sessionId: string,
    hash: string,
    usedAt: Date | null,
    revokedAt: Date | null,
    expiresAt: Date,
    createdAt: Date,
  ): ClientRefreshToken {
    return new ClientRefreshToken(id, sessionId, hash, usedAt, revokedAt, expiresAt, createdAt)
  }

  get hash(): string {
    return this._hash
  }

  get usedAt(): Date | null {
    return this._usedAt
  }

  get revokedAt(): Date | null {
    return this._revokedAt
  }

  isUsed(): boolean {
    return this._usedAt !== null
  }

  isRevoked(): boolean {
    return this._revokedAt !== null
  }

  isExpired(): boolean {
    return this.expiresAt <= new Date()
  }

  isActive(): boolean {
    return !this.isUsed() && !this.isRevoked() && !this.isExpired()
  }

  markAsUsed(): ClientRefreshToken {
    return new ClientRefreshToken(
      this.id,
      this.sessionId,
      this._hash,
      new Date(),
      this._revokedAt,
      this.expiresAt,
      this.createdAt,
    )
  }

  revoke(): ClientRefreshToken {
    return new ClientRefreshToken(
      this.id,
      this.sessionId,
      this._hash,
      this._usedAt,
      new Date(),
      this.expiresAt,
      this.createdAt,
    )
  }
}
