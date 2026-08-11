import { beforeEach, describe, expect, it } from 'vitest'
import { GetProjectFieldsHandler } from './GetProjectFieldsHandler'
import { GetProjectFieldsQuery } from './GetProjectFieldsQuery'
import { getTestContainer } from '../../../../tests/helpers/container'
import { truncateAll } from '../../../../tests/helpers/db'
import {
  seedProject,
  seedProjectWithField,
  PROJECT_SEED,
} from '../../../../tests/helpers/projectSeed'
import { NotFoundError } from '@shared/errors/NotFoundError'

const container = getTestContainer()
const handler = container.get(GetProjectFieldsHandler)

describe('GetProjectFieldsHandler', () => {
  beforeEach(async () => {
    await truncateAll(container)
  })

  it('returns empty array when no fields defined', async () => {
    const { clientId, projectId } = await seedProject(container)

    const result = await handler.execute(new GetProjectFieldsQuery(projectId, clientId))

    expect(result).toEqual([])
  })

  it('returns field with correct shape', async () => {
    const { clientId, projectId, fieldId } = await seedProjectWithField(container)

    const result = await handler.execute(new GetProjectFieldsQuery(projectId, clientId))

    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe(fieldId)
    expect(result[0]?.name).toBe(PROJECT_SEED.field.name)
    expect(result[0]?.type).toBe(PROJECT_SEED.field.type)
  })
  it('throws NotFoundError when clientId does not own the project', async () => {
    const { projectId } = await seedProject(container)

    await expect(
      handler.execute(new GetProjectFieldsQuery(projectId, '00000000-0000-0000-0000-000000000000')),
    ).rejects.toThrow(NotFoundError)
  })
})
