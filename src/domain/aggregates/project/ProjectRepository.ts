import type { Name } from '@valueObjects/Name'
import type { Project } from './Project'

export interface ProjectRepository {
  findById(id: string): Promise<Project | null>
  findByOwnerId(ownerId: string): Promise<Project[]>
  save(project: Project): Promise<void>
  findByOwnerAndName(ownerId: string, name: Name): Promise<Project | null>
  findByApiKeyHash(hash: string): Promise<Project | null>
  delete(id: string): Promise<void>
}

export const ProjectRepository: unique symbol = Symbol('ProjectRepository')
