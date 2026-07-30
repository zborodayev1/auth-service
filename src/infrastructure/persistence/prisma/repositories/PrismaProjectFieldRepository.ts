import { injectable } from 'inversify'
import { ProjectField } from '@aggregates/projectField/ProjectField'
import type { ProjectFieldRepository } from '@aggregates/projectField/ProjectFieldRepository'
import { projectFieldToDomain } from '../mappers/ProjectFieldMapper'
import { PrismaRepository } from '../PrismaRepository'

@injectable()
export class PrismaProjectFieldRepository
  extends PrismaRepository
  implements ProjectFieldRepository
{
  async save(field: ProjectField): Promise<void> {
    await this.prismaClient.projectField.upsert({
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
    const raw = await this.prismaClient.projectField.findUnique({ where: { id } })
    return raw ? projectFieldToDomain(raw) : null
  }

  async findByProjectId(projectId: string): Promise<ProjectField[]> {
    const raws = await this.prismaClient.projectField.findMany({ where: { projectId } })
    return raws.map(projectFieldToDomain)
  }

  async findByProjectAndName(projectId: string, name: string): Promise<ProjectField | null> {
    const raw = await this.prismaClient.projectField.findUnique({
      where: { projectId_name: { projectId, name } },
    })
    return raw ? projectFieldToDomain(raw) : null
  }

  async delete(id: string): Promise<void> {
    await this.prismaClient.projectField.delete({ where: { id } })
  }
}
