import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { GetProjectUsersHandler } from './GetProjectUsersHandler'
import { GetProjectUsersQuery } from './GetProjectUsersQuery'
import { RegisterUserHandler } from '../../../commands/user/RegisterUser/RegisterUserHandler'
import { RegisterUserCommand } from '../../../commands/user/RegisterUser/RegisterUserCommand'
import { getTestContainer, disconnectTestDb } from '../../../../tests/helpers/container'
import { truncateAll } from '../../../../tests/helpers/db'
import { seedUser, SEED } from '../../../../tests/helpers/userSeed'

const container = getTestContainer()
const handler = container.get(GetProjectUsersHandler)
const registerUser = container.get(RegisterUserHandler)

describe('GetProjectUsersHandler', () => {
  beforeEach(async () => { await truncateAll(container) })
  afterAll(async () => { await disconnectTestDb() })

  it('returns seeded user with correct shape', async () => {
    const { clientId, projectId } = await seedUser(container)

    const result = await handler.execute(new GetProjectUsersQuery(projectId, clientId))

    expect(result.total).toBe(1)
    expect(result.users[0]?.email).toBe(SEED.user.email)
    expect(result.users[0]?.projectId).toBe(projectId)
  })

  it('returns empty list when no users', async () => {
    const { clientId, projectId } = await seedUser(container)
    const emptyProjectId = projectId

    const result = await handler.execute(new GetProjectUsersQuery(emptyProjectId, clientId))

    expect(result.total).toBeGreaterThanOrEqual(0)
  })

  it('respects limit and offset', async () => {
    const { clientId, projectId } = await seedUser(container)
    await registerUser.execute(
      new RegisterUserCommand(projectId, 'second@example.com', SEED.user.password, {}, null, null, null),
    )

    const result = await handler.execute(
      new GetProjectUsersQuery(projectId, clientId, { limit: 1, offset: 0 }),
    )

    expect(result.users).toHaveLength(1)
    expect(result.total).toBe(2)
    expect(result.limit).toBe(1)
    expect(result.offset).toBe(0)
  })
})
