export class GetProjectFieldsQuery {
  constructor(
    public readonly projectId: string,
    public readonly clientId: string,
  ) {}
}
