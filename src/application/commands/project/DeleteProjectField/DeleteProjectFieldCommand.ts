export class DeleteProjectFieldCommand {
  constructor(
    public readonly fieldId: string,
    public readonly projectId: string,
    public readonly clientId: string,

    public readonly force: boolean,
  ) {}
}
