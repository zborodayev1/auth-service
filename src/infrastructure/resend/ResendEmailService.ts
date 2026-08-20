import type { IEmailService } from '@ports/IEmailService'
import { inject, injectable } from 'inversify'
import { Resend } from 'resend'

const FROM = 'onboarding@resend.dev'

function emailShell(title: string, preheader: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;">${preheader}</span>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
          <!-- header -->
          <tr>
            <td style="background:#18181b;padding:28px 40px;">
              <p style="margin:0;color:#ffffff;font-size:18px;font-weight:600;letter-spacing:-0.3px;">Auth Service</p>
            </td>
          </tr>
          <!-- body -->
          <tr>
            <td style="padding:40px;">
              ${body}
            </td>
          </tr>
          <!-- footer -->
          <tr>
            <td style="padding:20px 40px 32px;border-top:1px solid #f0f0f0;">
              <p style="margin:0;color:#a1a1aa;font-size:12px;line-height:1.6;">
                If you didn't request this, ignore this email — your account is safe.<br/>
                This link expires in 15 minutes.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
function tokenBox(token: string): string {
  return `
    <div style="
      margin:0 0 24px;
      padding:16px;
      background:#f4f4f5;
      border:1px solid #e4e4e7;
      border-radius:8px;
      font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;
      font-size:14px;
      line-height:1.5;
      word-break:break-all;
      color:#18181b;
    ">
      ${token}
    </div>
  `
}
@injectable()
export class ResendEmailService implements IEmailService {
  constructor(@inject(Resend) private readonly resend: Resend) {}

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const body = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#18181b;">
      Reset your password
    </h1>

    <p style="margin:0 0 20px;font-size:15px;color:#52525b;line-height:1.6;">
      Copy the token below and submit it in the application to reset your password.
    </p>

    ${tokenBox(token)}

    <p style="margin:0;font-size:13px;color:#71717a;line-height:1.6;">
      This token expires in 15 minutes.
    </p>
  `

    await this.resend.emails.send({
      from: FROM,
      to,
      subject: 'Password reset token',
      html: emailShell('Password reset', 'Your password reset token', body),
    })
  }
  async sendEmailVerificationEmail(to: string, token: string): Promise<void> {
    const body = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#18181b;">
      Verify your email
    </h1>

    <p style="margin:0 0 20px;font-size:15px;color:#52525b;line-height:1.6;">
      Copy the token below and submit it in the application to verify your email address.
    </p>

    ${tokenBox(token)}

    <p style="margin:0;font-size:13px;color:#71717a;line-height:1.6;">
      This token expires in 15 minutes.
    </p>
  `

    await this.resend.emails.send({
      from: FROM,
      to,
      subject: 'Email verification token',
      html: emailShell('Verify your email', 'Your email verification token', body),
    })
  }
}
