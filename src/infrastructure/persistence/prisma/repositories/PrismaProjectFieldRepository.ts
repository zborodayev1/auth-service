import { injectable } from 'inversify'
import { ProjectField } from '@aggregates/projectField/ProjectField'
import type { ProjectFieldRepository } from '@aggregates/projectField/ProjectFieldRepository'
import { PrismaProvider } from '../PrismaProvider'
import { projectFieldToDomain } from '../mappers/ProjectFieldMapper'

@injectable()
export class PrismaProjectFieldRepository implements ProjectFieldRepository {
  constructor(private readonly prisma: PrismaProvider) {}

  async save(field: ProjectField): Promise<void> {
    await this.prisma.projectField.upsert({
      where: { id: field.id },
      create: {
        id: field.id,
        projectId: field.projectId,
        name: field.name,
        type: field.type,
        required: field.required,
        defaultValue: field.defaultValue,
        enumValues: field.enumValues,
        createdAt: field.createdAt,
      },
      update: {
        name: field.name,
        required: field.required,
        defaultValue: field.defaultValue,
        enumValues: field.enumValues,
      },
    })
  }

  async findById(id: string): Promise<ProjectField | null> {
    const raw = await this.prisma.projectField.findUnique({ where: { id } })
    return raw ? projectFieldToDomain(raw) : null
  }

  async findByProjectId(projectId: string): Promise<ProjectField[]> {
    const raws = await this.prisma.projectField.findMany({ where: { projectId } })
    return raws.map(projectFieldToDomain)
  }

  async findByProjectAndName(projectId: string, name: string): Promise<ProjectField | null> {
    const raw = await this.prisma.projectField.findUnique({
      where: { projectId_name: { projectId, name } },
    })
    return raw ? projectFieldToDomain(raw) : null
  }

  async delete(id: string): Promise<void> {
    await this.prisma.projectField.delete({ where: { id } })
  }
}
