export class ChangeUserEmailCommand {
  constructor(
    public readonly userId: string,
    public readonly projectId: string,
    public readonly newEmail: string,
    public readonly password: string,
  ) {}
}
