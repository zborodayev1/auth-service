import type { PasswordHasher } from '@ports/PasswordHasher'
import { ServerConfig } from '@config/server'
import bcrypt from 'bcrypt'
import { inject, injectable } from 'inversify'

@injectable()
export class BcryptPasswordHasher implements PasswordHasher {
  constructor(
    @inject(ServerConfig)
    private readonly config: ServerConfig,
  ) {}

  async hash(raw: string): Promise<string> {
    return await bcrypt.hash(raw, this.config.bcryptRounds)
  }

  async verify(raw: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(raw, hash)
  }
}
