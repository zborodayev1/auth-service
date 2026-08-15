import { describe, expect, it } from 'vitest'
import { GetProjectUserHandler } from './GetProjectUserHandler'
import { GetProjectUserQuery } from './GetProjectUserQuery'
import { getTestContainer } from '@tests/helpers/container'
import { useTransactionIsolation } from '@tests/helpers/db'
import { seedUser, SEED } from '@tests/helpers/userSeed'
import { NotFoundError } from '@shared/errors/NotFoundError'

const container = getTestContainer()
const handler = container.get(GetProjectUserHandler)

describe('GetProjectUserHandler', () => {
  useTransactionIsolation(container)

  it('returns correct user profile', async () => {
    const { clientId, projectId, userId } = await seedUser(container)

    const result = await handler.execute(new GetProjectUserQuery(userId, clientId))

    expect(result.id).toBe(userId)
    expect(result.email).toBe(SEED.user.email)
    expect(result.projectId).toBe(projectId)
    expect(result.createdAt).toBeInstanceOf(Date)
    expect(Array.isArray(result.fields)).toBe(true)
  })
  it('throws NotFoundError when clientId does not own the user project', async () => {
    const { userId } = await seedUser(container)

    await expect(
      handler.execute(new GetProjectUserQuery(userId, '00000000-0000-0000-0000-000000000000')),
    ).rejects.toThrow(NotFoundError)
  })
})
