export class GetUserSessionsQuery {
  constructor(
    public readonly userId: string,
    public readonly currentSessionId: string,
  ) {}
}
