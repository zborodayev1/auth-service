export class UpdateProjectFieldCommand {
  constructor(
    public readonly projectId: string,
    public readonly clientId: string,
    public readonly fieldId: string,

    public readonly name: string,
    public readonly required: boolean,
    public readonly defaultValue: string | null,
    public readonly enumValues: string[],
  ) {}
}
