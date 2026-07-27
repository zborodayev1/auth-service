import type { FieldType } from '@aggregates/projectField/FieldType'

export class AddProjectFieldCommand {
  constructor(
    public readonly projectId: string,

    public readonly name: string,
    public readonly type: FieldType,
    public readonly required: boolean,
    public readonly defaultValue: string | null,
    public readonly enumValues: string[],
  ) {}
}
