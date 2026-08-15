export class RevokeClientSessionCommand {
  constructor(
    public readonly sessionId: string,
    public readonly clientId: string,
    public readonly currentSessionId: string,
  ) {}
}
