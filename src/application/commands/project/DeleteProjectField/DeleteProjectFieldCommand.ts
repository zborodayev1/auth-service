export class DeleteProjectFieldCommand {
  constructor(
    public readonly fieldId: string,
    public readonly projectId: string,

    public readonly force: boolean,
  ) {}
}
