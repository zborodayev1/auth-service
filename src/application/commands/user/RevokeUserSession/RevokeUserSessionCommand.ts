export class RevokeUserSessionCommand {
  constructor(
    public readonly sessionId: string,
    public readonly userId: string,
    public readonly currentSessionId: string,
  ) {}
}
