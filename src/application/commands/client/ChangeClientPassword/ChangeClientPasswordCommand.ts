export class ChangeClientPasswordCommand {
  constructor(
    public readonly clientId: string,
    public readonly currentPassword: string,
    public readonly newPassword: string,
  ) {}
}
