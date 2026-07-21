export class LogoutCurrentClientSessionCommand {
  constructor(
    public readonly sessionId: string,
    public readonly clientId: string,
  ) {}
}
