export class SetUserFieldCommand {
  constructor(
    public readonly userId: string,
    public readonly projectId: string,
    public readonly fieldId: string,
    public readonly value: string,
  ) {}
}
