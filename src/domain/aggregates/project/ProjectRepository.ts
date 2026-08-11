import type { Name } from '@valueObjects/Name/Name'
import type { Project } from './Project'

export interface ProjectRepository {
  findById(id: string): Promise<Project | null>
  findByOwnerId(ownerId: string): Promise<Project[]>
  save(project: Project): Promise<void>
  findByOwnerAndName(ownerId: string, name: Name): Promise<Project | null>
  findByApiKeyHash(hash: string): Promise<Project | null>
  deleteApiKey(projectId: string): Promise<void>
  delete(id: string): Promise<void>
}

export const ProjectRepository: unique symbol = Symbol('ProjectRepository')
