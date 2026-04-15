import { injectable } from 'inversify'

injectable()
export class ServerConfig {
  get port(): number {
    return Number(process.env['PORT'] ?? 3000)
  }
}
