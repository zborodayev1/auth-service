export class ChangeClientEmailCommand {
  constructor(
    public readonly clientId: string,
    public readonly newEmail: string,
    public readonly password: string,
  ) {}
}
