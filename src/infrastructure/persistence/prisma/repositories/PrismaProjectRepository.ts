import { injectable, inject } from 'inversify'
import { ProjectRepository } from '@aggregates/project/ProjectRepository'
import { Project } from '@aggregates/project/Project'

import { projectToDomain } from '../mappers/ProjectMapper'
import { TransactionContext } from '../TransactionContext'
import { PrismaRepository } from '../PrismaRepository'
import { Name } from '@valueObjects/Name/Name'

@injectable()
export class PrismaProjectRepository extends PrismaRepository implements ProjectRepository {
  constructor(@inject(TransactionContext) ctx: TransactionContext) {
    super(ctx)
  }

  async findById(id: string): Promise<Project | null> {
    const raw = await this.prismaClient.project.findUnique({
      where: { id },
      include: { apiKey: true },
    })
    return raw ? projectToDomain(raw) : null
  }

  async findByOwnerId(ownerId: string): Promise<Project[]> {
    const raws = await this.prismaClient.project.findMany({
      where: { ownerId },
      include: { apiKey: true },
    })
    return raws.map(projectToDomain)
  }

  async save(project: Project): Promise<void> {
    await this.withAtomicOps(async (tx) => {
      await tx.project.upsert({
        where: { id: project.id },
        create: {
          id: project.id,
          name: project.name,
          ownerId: project.ownerId,
          jwtSecret: project.jwtSecret,
          createdAt: project.createdAt,
        },
        update: { name: project.name },
      })

      await tx.apiKey.upsert({
        where: { projectId: project.id },
        create: {
          id: project.apiKey.id,
          name: project.apiKey.name,
          hash: project.apiKey.hash,
          revoked: project.apiKey.revoked,
          projectId: project.id,
        },
        update: {
          revoked: project.apiKey.revoked,
          hash: project.apiKey.hash,
          name: project.apiKey.name,
          id: project.apiKey.id,
        },
      })
    })
  }

  async findByOwnerAndName(ownerId: string, name: Name): Promise<Project | null> {
    const raw = await this.prismaClient.project.findUnique({
      where: { ownerId_name: { ownerId, name: name.getValue() } },
      include: { apiKey: true },
    })
    return raw ? projectToDomain(raw) : null
  }

  async findByApiKeyHash(hash: string): Promise<Project | null> {
    const raw = await this.prismaClient.project.findFirst({
      where: { apiKey: { hash } },
      include: { apiKey: true },
    })
    return raw ? projectToDomain(raw) : null
  }

  async deleteApiKey(projectId: string): Promise<void> {
    await this.prismaClient.apiKey.deleteMany({ where: { projectId } })
  }

  async delete(id: string): Promise<void> {
    await this.prismaClient.project.delete({ where: { id } })
  }
}
