export class DeleteProjectUserCommand {
  constructor(
    public readonly clientId: string,
    public readonly projectId: string,
    public readonly userId: string,
  ) {}
}
