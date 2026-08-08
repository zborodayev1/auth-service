import { Entity } from '@libs/ddd/Entity'

export class UserFieldValue extends Entity {
  private constructor(
    id: string,
    public readonly userId: string,
    public readonly fieldId: string,
    public readonly value: string,
    public readonly updatedAt: Date,
    public readonly deletedAt: Date | null,
  ) {
    super(id)
  }

  static create(params: {
    id: string
    userId: string
    fieldId: string
    value: string
  }): UserFieldValue {
    return new UserFieldValue(
      params.id,
      params.userId,
      params.fieldId,
      params.value,
      new Date(),
      null,
    )
  }

  static reconstruct(
    id: string,
    userId: string,
    fieldId: string,
    value: string,
    updatedAt: Date,
    deletedAt: Date | null,
  ): UserFieldValue {
    return new UserFieldValue(id, userId, fieldId, value, updatedAt, deletedAt)
  }
}
