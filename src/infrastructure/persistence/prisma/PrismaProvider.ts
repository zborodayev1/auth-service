import { inject, injectable } from 'inversify'
import { PrismaClient } from '@generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { ServerConfig } from '@config/server/server'

@injectable()
export class PrismaProvider extends PrismaClient {
  constructor(
    @inject(ServerConfig)
    private readonly serverConfig: ServerConfig,
  ) {
    const schema = process.env['TEST_SCHEMA']
    const pool = new Pool({
      connectionString: serverConfig.dbUrl,
      max: schema ? 1 : 10,
    })
    super({ adapter: new PrismaPg(pool, schema ? { schema } : undefined) })
  }
}
