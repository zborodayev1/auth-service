export class GetProjectApiKeyQuery {
  constructor(
    public readonly projectId: string,
    public readonly clientId: string,
  ) {}
}
