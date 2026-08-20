export class RequestClientEmailChangeCommand {
  constructor(
    public readonly clientId: string,
    public readonly newEmail: string,
    public readonly password: string,
  ) {}
}
