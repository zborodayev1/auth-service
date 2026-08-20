export class ConfirmRegisterClientCommand {
  constructor(
    public readonly token: string,
    public readonly userAgent: string | null,
    public readonly ipAddress: string | null,
    public readonly deviceName: string | null,
  ) {}
}
