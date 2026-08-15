import { Router } from 'express'
import { injectable, inject } from 'inversify'
import { PrismaProvider } from '@infra/persistence/prisma/PrismaProvider'

@injectable()
export class HealthRouter {
  constructor(@inject(PrismaProvider) private readonly prisma: PrismaProvider) {}

  build(): Router {
    const router = Router()

    router.get('/', (_req, res) => {
      res.status(200).json({ status: 'ok', uptime: process.uptime() })
    })

    router.get('/ready', async (_req, res) => {
      await this.prisma.$queryRaw`SELECT 1`
      res.status(200).json({ status: 'ready' })
    })

    return router
  }
}
