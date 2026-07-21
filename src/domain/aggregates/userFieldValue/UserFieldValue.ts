import { Entity } from '@libs/ddd/Entity'

export class UserFieldValue extends Entity {
  private constructor(
    id: string,
    public readonly userId: string,
    public readonly fieldId: string,
    public readonly value: string,
    public readonly updatedAt: Date,
  ) {
    super(id)
  }

  static create(id: string, userId: string, fieldId: string, value: string): UserFieldValue {
    return new UserFieldValue(id, userId, fieldId, value, new Date())
  }

  static reconstruct(
    id: string,
    userId: string,
    fieldId: string,
    value: string,
    updatedAt: Date,
  ): UserFieldValue {
    return new UserFieldValue(id, userId, fieldId, value, updatedAt)
  }
}
