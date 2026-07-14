export class LogoutAllSessionsCommand {
  constructor(
    public readonly sessionId: string,
    public readonly clientId: string,
  ) {}
}
