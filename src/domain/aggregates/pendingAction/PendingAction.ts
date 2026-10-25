import { AggregateRoot } from '@libs/ddd/AggregateRoot'
import type { JsonValue } from '@shared/types/Json'

export type PendingActionContext = Record<string, JsonValue>

export class PendingAction extends AggregateRoot {
  private constructor(
    id: string,
    private readonly _tokenHash: string,
    private readonly _context: PendingActionContext,
    private readonly _expiresAt: Date,
    public readonly createdAt: Date,
  ) {
    super(id)
  }

  get tokenHash(): string {
    return this._tokenHash
  }

  get context(): PendingActionContext {
    return this._context
  }

  get expiresAt(): Date {
    return this._expiresAt
  }

  isExpired(now: Date = new Date()): boolean {
    return this._expiresAt <= now
  }

  static create(
    id: string,
    tokenHash: string,
    context: PendingActionContext,
    expiresAt: Date,
  ): PendingAction {
    return new PendingAction(id, tokenHash, context, expiresAt, new Date())
  }

  static reconstruct(
    id: string,
    tokenHash: string,
    context: PendingActionContext,
    expiresAt: Date,
    createdAt: Date,
  ): PendingAction {
    return new PendingAction(id, tokenHash, context, expiresAt, createdAt)
  }
}
