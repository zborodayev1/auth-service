export class LogoutAllClientSessionsCommand {
  constructor(
    public readonly sessionId: string,
    public readonly clientId: string,
  ) {}
}
