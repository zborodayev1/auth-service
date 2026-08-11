export class DeleteUserSelfCommand {
  constructor(
    public readonly userId: string,
    public readonly password: string,
    public readonly projectId: string,
  ) {}
}
