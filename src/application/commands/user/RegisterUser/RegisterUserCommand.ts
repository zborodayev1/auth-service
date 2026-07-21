export class RegisterUserCommand {
  constructor(
    public readonly projectId: string,
    public readonly email: string,
    public readonly password: string,
    public readonly fields: Record<string, unknown>,

    public readonly userAgent: string | null,
    public readonly ipAddress: string | null,
    public readonly deviceName: string | null,
  ) {}
}
