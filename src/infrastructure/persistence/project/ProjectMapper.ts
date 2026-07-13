import type { Prisma } from '@prisma/client'
import { Project } from '@aggregates/project/Project'
import { ApiKey } from '@aggregates/project/ApiKey'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { Name } from '@valueObjects/Name'

type PrismaProjectWithApiKey = Prisma.ProjectGetPayload<{
  include: { apiKey: true }
}>

export function projectToDomain(raw: PrismaProjectWithApiKey): Project {
  if (!raw.apiKey)
    throw new NotFoundError('Project has no apiKey', 'PROJECT_HAS_NO_API_KEY', {
      projectId: raw.id,
    })

  const apiKey = ApiKey.reconstruct(
    raw.apiKey.id,
    Name.create(raw.apiKey.name),
    raw.apiKey.hash,
    raw.apiKey.revoked,
    raw.apiKey.createdAt,
  )

  return Project.reconstruct(raw.id, Name.create(raw.name), raw.ownerId, apiKey, raw.createdAt)
}
