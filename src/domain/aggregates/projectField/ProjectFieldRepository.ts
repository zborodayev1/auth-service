import type { ProjectField } from './ProjectField'

export interface ProjectFieldRepository {
  save(field: ProjectField): Promise<void>
  findByProjectId(projectId: string): Promise<ProjectField[]>
  findByProjectAndName(projectId: string, name: string): Promise<ProjectField | null>
  findByIdAndProject(id: string, projectId: string): Promise<ProjectField | null>
  findDeletedByIdAndProject(id: string, projectId: string): Promise<ProjectField | null>
  delete(id: string): Promise<void>
  countByProjectId(projectId: string): Promise<number>
  deleteByProjectId(projectId: string): Promise<void>
}

export const ProjectFieldRepository: unique symbol = Symbol('ProjectFieldRepository')
