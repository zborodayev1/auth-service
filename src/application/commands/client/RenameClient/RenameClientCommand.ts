export class RenameClientCommand {
  constructor(
    public readonly clientId: string,
    public readonly name: string,
  ) {}
}
