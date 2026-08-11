export class LogoutAllUserSessionsCommand {
  constructor(
    public readonly userId: string,
    public readonly projectId: string,
  ) {}
}
