import { ProjectField } from '@aggregates/projectField/ProjectField'
import type { FieldType } from '@aggregates/projectField/FieldType'
import type { Prisma } from '@generated/prisma/client'

type PrismaProjectFieldRow = Prisma.ProjectFieldGetPayload<Record<string, never>>

export function projectFieldToDomain(raw: PrismaProjectFieldRow): ProjectField {
  return ProjectField.reconstruct(
    raw.id,
    raw.projectId,
    raw.name,
    raw.type as FieldType,
    raw.required,
    raw.defaultValue,
    raw.enumValues,
    raw.createdAt,
  )
}
