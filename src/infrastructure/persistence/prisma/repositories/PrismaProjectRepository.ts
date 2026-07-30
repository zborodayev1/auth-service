import { injectable } from 'inversify'
import { ProjectRepository } from '@aggregates/project/ProjectRepository'
import { Project } from '@aggregates/project/Project'

import { projectToDomain } from '../mappers/ProjectMapper'
import { PrismaRepository } from '../PrismaRepository'

@injectable()
export class PrismaProjectRepository extends PrismaRepository implements ProjectRepository {
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
        update: { revoked: project.apiKey.revoked, hash: project.apiKey.hash },
      })
    })
  }
}
