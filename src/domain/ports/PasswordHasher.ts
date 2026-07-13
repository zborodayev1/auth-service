export interface PasswordHasher {
  hash(raw: string): Promise<string>
  verify(raw: string, hash: string): Promise<boolean>
}

export const PasswordHasher: unique symbol = Symbol('PasswordHasher')
