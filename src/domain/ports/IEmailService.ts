export interface IEmailService {
  sendPasswordResetEmail(to: string, token: string): Promise<void>
  sendEmailVerificationEmail(to: string, token: string): Promise<void>
}

export const IEmailService: unique symbol = Symbol('IEmailService')
