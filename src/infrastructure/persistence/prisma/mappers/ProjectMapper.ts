import type { Prisma } from '@generated/prisma/client'
import { Project } from '@aggregates/project/Project'
import { ApiKey } from '@aggregates/project/ApiKey'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { Name } from '@valueObjects/Name/Name'
import { NOT_FOUND_ERROR_CODES } from '@shared/errors/ErrorCodes'

type PrismaProjectWithApiKey = Prisma.ProjectGetPayload<{
  include: { apiKey: true }
}>

export function projectToDomain(raw: PrismaProjectWithApiKey): Project {
  if (!raw.apiKey)
    throw new NotFoundError('Project has no apiKey', NOT_FOUND_ERROR_CODES.RESOURCE_NOT_FOUND, {
      projectId: raw.id,
    })

  const apiKey = ApiKey.reconstruct(
    raw.apiKey.id,
    Name.create(raw.apiKey.name),
    raw.apiKey.hash,
    raw.apiKey.revoked,
    raw.apiKey.createdAt,
  )

  return Project.reconstruct(
    raw.id,
    Name.create(raw.name),
    raw.ownerId,
    apiKey,
    raw.jwtSecret,
    raw.createdAt,
  )
}
