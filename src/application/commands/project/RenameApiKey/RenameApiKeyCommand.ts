export class RenameApiKeyCommand {
  constructor(
    public readonly clientId: string,
    public readonly projectId: string,
    public readonly name: string,
  ) {}
}
