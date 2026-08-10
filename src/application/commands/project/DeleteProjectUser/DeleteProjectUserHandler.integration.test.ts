import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { DeleteProjectUserHandler } from './DeleteProjectUserHandler'
import { DeleteProjectUserCommand } from './DeleteProjectUserCommand'
import { LoginUserHandler } from '../../user/LoginUser/LoginUserHandler'
import { LoginUserCommand } from '../../user/LoginUser/LoginUserCommand'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { getTestContainer, disconnectTestDb } from '../../../../tests/helpers/container'
import { truncateAll } from '../../../../tests/helpers/db'
import { seedUser, SEED } from '../../../../tests/helpers/userSeed'

const container = getTestContainer()
const handler = container.get(DeleteProjectUserHandler)
const loginUser = container.get(LoginUserHandler)

describe('DeleteProjectUserHandler', () => {
  beforeEach(async () => { await truncateAll(container) })
  afterAll(async () => { await disconnectTestDb() })

  it('deletes user successfully', async () => {
    const { clientId, userId } = await seedUser(container)

    const result = await handler.execute(new DeleteProjectUserCommand(clientId, '', userId))

    expect(result.success).toBe(true)
  })

  it('user cannot login after deletion', async () => {
    const { clientId, projectId, userId } = await seedUser(container)

    await handler.execute(new DeleteProjectUserCommand(clientId, projectId, userId))

    await expect(
      loginUser.execute(new LoginUserCommand(SEED.user.password, SEED.user.email, projectId, null, null, null)),
    ).rejects.toThrow(UnauthorizedError)
  })
})
