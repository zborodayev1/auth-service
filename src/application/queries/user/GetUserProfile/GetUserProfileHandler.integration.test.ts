import { beforeEach, describe, expect, it } from 'vitest'
import { GetUserProfileHandler } from './GetUserProfileHandler'
import { GetUserProfileQuery } from './GetUserProfileQuery'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { getTestContainer } from '../../../../tests/helpers/container'
import { truncateAll } from '../../../../tests/helpers/db'
import { seedUser, SEED } from '../../../../tests/helpers/userSeed'

const container = getTestContainer()
const handler = container.get(GetUserProfileHandler)

describe('GetUserProfileHandler', () => {
  beforeEach(async () => {
    await truncateAll(container)
  })

  it('returns correct profile fields', async () => {
    const { userId, projectId } = await seedUser(container)

    const profile = await handler.execute(new GetUserProfileQuery(userId))

    expect(profile.userId).toBe(userId)
    expect(profile.email).toBe(SEED.user.email)
    expect(profile.projectId).toBe(projectId)
    expect(profile.createdAt).toBeInstanceOf(Date)
    expect(Array.isArray(profile.fields)).toBe(true)
  })

  it('throws NotFoundError for unknown userId', async () => {
    await expect(
      handler.execute(new GetUserProfileQuery('00000000-0000-0000-0000-000000000000')),
    ).rejects.toThrow(NotFoundError)
  })
})
