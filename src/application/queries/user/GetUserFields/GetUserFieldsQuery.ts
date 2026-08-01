export class GetUserFieldsQuery {
  constructor(
    public readonly userId: string,
    public readonly projectId: string,
  ) {}
}
