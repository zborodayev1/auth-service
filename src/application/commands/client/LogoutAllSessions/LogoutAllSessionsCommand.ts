export class LogoutAllSessionsCommand {
  constructor(
    public readonly rawToken: string,
    public readonly clientId: string,
  ) {}
}
