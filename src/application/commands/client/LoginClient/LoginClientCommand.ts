export class LoginClientCommand {
  constructor(
    public readonly password: string,
    public readonly email: string,

    public readonly userAgent: string | null,
    public readonly ipAddress: string | null,
    public readonly deviceName: string | null,
  ) {}
}
