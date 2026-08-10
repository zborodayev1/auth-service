import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { GetProjectFieldsHandler } from './GetProjectFieldsHandler'
import { GetProjectFieldsQuery } from './GetProjectFieldsQuery'
import { getTestContainer, disconnectTestDb } from '../../../../tests/helpers/container'
import { truncateAll } from '../../../../tests/helpers/db'
import { seedProject, seedProjectWithField, PROJECT_SEED } from '../../../../tests/helpers/projectSeed'

const container = getTestContainer()
const handler = container.get(GetProjectFieldsHandler)

describe('GetProjectFieldsHandler', () => {
  beforeEach(async () => { await truncateAll(container) })
  afterAll(async () => { await disconnectTestDb() })

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
})
