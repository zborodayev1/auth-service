import { beforeEach, describe, expect, it } from 'vitest'
import { GetProjectUsersHandler } from './GetProjectUsersHandler'
import { GetProjectUsersQuery } from './GetProjectUsersQuery'
import { RegisterUserHandler } from '../../../commands/user/RegisterUser/RegisterUserHandler'
import { RegisterUserCommand } from '../../../commands/user/RegisterUser/RegisterUserCommand'
import { getTestContainer } from '@tests/helpers/container'
import { truncateAll } from '@tests/helpers/db'
import { SEED } from '@tests/helpers/userSeed'
import { seedProject } from '@tests/helpers/projectSeed'
import { NotFoundError } from '@shared/errors/NotFoundError'

const container = getTestContainer()
const handler = container.get(GetProjectUsersHandler)
const registerUser = container.get(RegisterUserHandler)

describe('GetProjectUsersHandler', () => {
  beforeEach(async () => {
    await truncateAll(container)
  })

  it('returns seeded user with correct shape', async () => {
    const { clientId, projectId } = await seedProject(container)
    await registerUser.execute(
      new RegisterUserCommand(projectId, SEED.user.email, SEED.user.password, {}, null, null, null),
    )

    const result = await handler.execute(new GetProjectUsersQuery(projectId, clientId))

    expect(result.total).toBe(1)
    expect(result.users[0]?.email).toBe(SEED.user.email)
    expect(result.users[0]?.projectId).toBe(projectId)
  })

  it('returns empty list when no users', async () => {
    const { clientId, projectId } = await seedProject(container)

    const result = await handler.execute(new GetProjectUsersQuery(projectId, clientId))

    expect(result.total).toBe(0)
    expect(result.users).toEqual([])
  })

  it('respects limit', async () => {
    const { clientId, projectId } = await seedProject(container)
    await registerUser.execute(
      new RegisterUserCommand(projectId, SEED.user.email, SEED.user.password, {}, null, null, null),
    )
    await registerUser.execute(
      new RegisterUserCommand(
        projectId,
        'second@example.com',
        SEED.user.password,
        {},
        null,
        null,
        null,
      ),
    )

    const result = await handler.execute(
      new GetProjectUsersQuery(projectId, clientId, { limit: 1, offset: 0 }),
    )

    expect(result.users).toHaveLength(1)
    expect(result.total).toBe(2)
    expect(result.limit).toBe(1)
  })

  it('respects offset', async () => {
    const { clientId, projectId } = await seedProject(container)
    await registerUser.execute(
      new RegisterUserCommand(projectId, SEED.user.email, SEED.user.password, {}, null, null, null),
    )
    await registerUser.execute(
      new RegisterUserCommand(
        projectId,
        'second@example.com',
        SEED.user.password,
        {},
        null,
        null,
        null,
      ),
    )

    const page0 = await handler.execute(
      new GetProjectUsersQuery(projectId, clientId, { limit: 1, offset: 0 }),
    )
    const page1 = await handler.execute(
      new GetProjectUsersQuery(projectId, clientId, { limit: 1, offset: 1 }),
    )

    expect(page0.users[0]?.email).not.toBe(page1.users[0]?.email)
    expect(page1.offset).toBe(1)
  })

  it('throws NotFoundError when clientId does not own the project', async () => {
    const { projectId } = await seedProject(container)

    await expect(
      handler.execute(new GetProjectUsersQuery(projectId, '00000000-0000-0000-0000-000000000000')),
    ).rejects.toThrow(NotFoundError)
  })
})
