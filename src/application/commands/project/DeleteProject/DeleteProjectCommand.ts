export class DeleteProjectCommand {
  constructor(
    public readonly clientId: string,
    public readonly projectId: string,
  ) {}
}
