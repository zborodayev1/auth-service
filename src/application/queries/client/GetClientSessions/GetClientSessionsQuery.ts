export class GetClientSessionsQuery {
  constructor(
    public readonly clientId: string,
    public readonly currentSessionId: string,
  ) {}
}
