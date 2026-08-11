export class DeleteProjectUserCommand {
  constructor(
    public readonly clientId: string,
    public readonly userId: string,
  ) {}
}
