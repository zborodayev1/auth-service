import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { GetProjectUserHandler } from './GetProjectUserHandler'
import { GetProjectUserQuery } from './GetProjectUserQuery'
import { getTestContainer, disconnectTestDb } from '../../../../tests/helpers/container'
import { truncateAll } from '../../../../tests/helpers/db'
import { seedUser, SEED } from '../../../../tests/helpers/userSeed'

const container = getTestContainer()
const handler = container.get(GetProjectUserHandler)

describe('GetProjectUserHandler', () => {
  beforeEach(async () => { await truncateAll(container) })
  afterAll(async () => { await disconnectTestDb() })

  it('returns correct user profile', async () => {
    const { clientId, projectId, userId } = await seedUser(container)

    const result = await handler.execute(new GetProjectUserQuery(userId, clientId))

    expect(result.id).toBe(userId)
    expect(result.email).toBe(SEED.user.email)
    expect(result.projectId).toBe(projectId)
    expect(result.createdAt).toBeInstanceOf(Date)
    expect(Array.isArray(result.fields)).toBe(true)
  })
})
