export class GetProjectUsersQuery {
  constructor(
    public readonly projectId: string,
    public readonly clientId: string,
    public readonly opts?: { limit: number; offset: number },
  ) {}
}
