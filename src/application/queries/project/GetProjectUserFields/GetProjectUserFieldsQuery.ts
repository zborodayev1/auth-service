export class GetProjectUserFieldsQuery {
  constructor(
    public readonly userId: string,
    public readonly clientId: string,
  ) {}
}
