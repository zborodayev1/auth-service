import { AggregateRoot } from '@libs/ddd/AggregateRoot'
import type { FieldType } from './FieldType'

export class ProjectField extends AggregateRoot {
  private constructor(
    id: string,
    public readonly projectId: string,

    public readonly name: string,
    public readonly type: FieldType,
    public readonly required: boolean,
    public readonly defaultValue: string | null,
    public readonly enumValues: string[],

    public readonly createdAt: Date,
  ) {
    super(id)
  }

  static create(
    id: string,
    projectId: string,
    name: string,
    type: FieldType,
    required: boolean,
    defaultValue: string | null,
    enumValues: string[],
  ): ProjectField {
    return new ProjectField(
      id,
      projectId,
      name,
      type,
      required,
      defaultValue,
      enumValues,
      new Date(),
    )
  }

  static reconstruct(
    id: string,
    projectId: string,
    name: string,
    type: FieldType,
    required: boolean,
    defaultValue: string | null,
    enumValues: string[],
    createdAt: Date,
  ): ProjectField {
    return new ProjectField(
      id,
      projectId,
      name,
      type,
      required,
      defaultValue,
      enumValues,
      createdAt,
    )
  }
}
