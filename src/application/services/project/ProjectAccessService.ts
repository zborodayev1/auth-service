import { Project } from '@aggregates/project/Project'
import { ProjectRepository } from '@aggregates/project/ProjectRepository'
import { User } from '@aggregates/user/User'
import { UserRepository } from '@aggregates/user/UserRepository'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { injectable, inject } from 'inversify'

@injectable()
export class ProjectAccessService {
  constructor(
    @inject(ProjectRepository) private readonly projects: ProjectRepository,
    @inject(UserRepository) private readonly users: UserRepository,
  ) {}

  async verifyByProjectId(clientId: string, projectId: string): Promise<Project> {
    const project = await this.projects.findById(projectId)

    if (!project)
      throw new NotFoundError('Project not found', 'PROJECT_NOT_FOUND', {
        query: { clientId, projectId },
      })

    if (project.ownerId !== clientId)
      throw new NotFoundError('Project not found', 'ACCESS_DENIED', {
        query: { clientId, projectId },
        project: project,
      })

    return project
  }

  async verifyByUserId(
    clientId: string,
    userId: string,
  ): Promise<{ project: Project; user: User }> {
    const user = await this.users.findById(userId)
    if (!user)
      throw new NotFoundError('User not found', 'USER_NOT_FOUND', { query: { clientId, userId } })

    const project = await this.projects.findById(user.projectId)
    if (!project)
      throw new NotFoundError('Project not found', 'PROJECT_NOT_FOUND', {
        query: { clientId, userId },
      })

    if (project.ownerId !== clientId)
      throw new NotFoundError('Project not found', 'ACCESS_DENIED', { query: { clientId, userId } })

    return { project: project, user: user }
  }
}
