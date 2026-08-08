export class RecoverProjectFieldCommand {
  constructor(
    public readonly projectId: string,
    public readonly fieldId: string,
  ) {}
}
