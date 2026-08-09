export class UpdateProjectUserFieldCommand {
  constructor(
    public readonly clientId: string,
    public readonly userId: string,
    public readonly fieldId: string,
    public readonly value: string,
  ) {}
}
