export class ChangeUserPasswordCommand {
  constructor(
    public readonly userId: string,
    public readonly projectId: string,
    public readonly currentPassword: string,
    public readonly newPassword: string,
  ) {}
}
