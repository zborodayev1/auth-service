import { inject, injectable } from 'inversify'
import { GetProjectUsersQuery } from './GetProjectUsersQuery'
import { UserRepository } from '@aggregates/user/UserRepository'
import { ProjectAccessService } from '@services/project/ProjectAccessService'

interface GetProjectUsersResult {
  users: {
    id: string
    email: string
    projectId: string
    createdAt: Date
  }[]

  total: number
  limit: number
  offset: number
}

@injectable()
export class GetProjectUsersHandler {
  constructor(
    @inject(UserRepository)
    private readonly users: UserRepository,

    @inject(ProjectAccessService)
    private readonly accessService: ProjectAccessService,
  ) {}

  async execute(query: GetProjectUsersQuery): Promise<GetProjectUsersResult> {
    await this.accessService.verifyByProjectId(query.clientId, query.projectId)
    const opts = query.opts ?? { limit: 20, offset: 0 }
    const users = await this.users.findByProjectId(query.projectId, opts)

    const count = await this.users.countByProjectId(query.projectId)

    const sanitizeUsers = users.map((u) => ({
      id: u.id,
      projectId: u.projectId,
      email: u.email.toString(),
      createdAt: u.createdAt,
    }))

    return {
      users: sanitizeUsers,
      total: count,
      limit: opts.limit,
      offset: opts.offset,
    }
  }
}
