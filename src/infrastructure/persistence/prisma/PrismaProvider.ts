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
    super({
      adapter: new PrismaPg(
        new Pool({
          connectionString: serverConfig.dbUrl,
        }),
      ),
    })
  }
}
