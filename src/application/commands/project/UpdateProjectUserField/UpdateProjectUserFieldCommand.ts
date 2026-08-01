export class UpdateProjectUserFieldCommand {
  constructor(
    public readonly clientId: string,
    public readonly userId: string,
    public readonly fieldName: string,
    public readonly value: string,
  ) {}
}
