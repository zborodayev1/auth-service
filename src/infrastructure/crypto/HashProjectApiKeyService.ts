import { injectable, inject } from 'inversify'
import { ProjectApiKeyService, ProjectApiKeyPayload } from '@ports/ProjectApiKeyService'
import { ProjectRepository } from '@aggregates/project/ProjectRepository'
import { Hasher } from '@ports/Hasher'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'

@injectable()
export class HashProjectApiKeyService implements ProjectApiKeyService {
  constructor(
    @inject(ProjectRepository) private readonly projects: ProjectRepository,
    @inject(Hasher) private readonly hasher: Hasher,
  ) {}

  async verify(rawKey: string): Promise<ProjectApiKeyPayload> {
    const hash = this.hasher.hash(rawKey)

    const project = await this.projects.findByApiKeyHash(hash)

    if (!project) throw new UnauthorizedError('Invalid API key', 'INVALID_API_KEY')
    if (project.apiKey.revoked) throw new UnauthorizedError('Invalid API key', 'INVALID_API_KEY')

    return { projectId: project.id }
  }
}
