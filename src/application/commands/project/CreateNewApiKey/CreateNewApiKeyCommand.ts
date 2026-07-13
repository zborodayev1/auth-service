export class CreateNewApiKeyCommand {
  constructor(
    public readonly projectId: string,
    public readonly ownerId: string,
  ) {}
}
