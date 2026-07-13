import type { Project } from './Project'

export interface ProjectRepository {
  findById(id: string): Promise<Project | null>
  findByOwnerId(ownerId: string): Promise<Project[]>
  save(project: Project): Promise<void>
}

export const ProjectRepository: unique symbol = Symbol('ProjectRepository')
