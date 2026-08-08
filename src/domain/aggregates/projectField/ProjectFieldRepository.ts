import type { ProjectField } from './ProjectField'

export interface ProjectFieldRepository {
  save(field: ProjectField): Promise<void>
  findById(id: string): Promise<ProjectField | null>
  findByProjectId(projectId: string): Promise<ProjectField[]>
  findByProjectAndName(projectId: string, name: string): Promise<ProjectField | null>
  delete(id: string): Promise<void>
  countByProjectId(projectId: string): Promise<number>
  deleteByProjectId(projectId: string): Promise<void>
  findDeletedById(id: string): Promise<ProjectField | null>
}

export const ProjectFieldRepository: unique symbol = Symbol('ProjectFieldRepository')
