export class LogoutCurrentSessionCommand {
  constructor(
    public readonly sessionId: string,
    public readonly clientId: string,
  ) {}
}
