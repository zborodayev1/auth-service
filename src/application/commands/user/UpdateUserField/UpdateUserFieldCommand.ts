export class UpdateUserFieldCommand {
  constructor(
    public readonly userId: string,
    public readonly projectId: string,
    public readonly fieldName: string,
    public readonly value: string,
  ) {}
}
