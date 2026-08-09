export class GetUserFieldQuery {
  constructor(
    public readonly userId: string,
    public readonly projectId: string,
    public readonly fieldId: string,
  ) {}
}
