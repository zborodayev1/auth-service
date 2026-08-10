import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { DeleteUserSelfHandler } from './DeleteUserSelfHandler'
import { DeleteUserSelfCommand } from './DeleteUserSelfCommand'
import { LoginUserHandler } from '../LoginUser/LoginUserHandler'
import { LoginUserCommand } from '../LoginUser/LoginUserCommand'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { getTestContainer, disconnectTestDb } from '../../../../tests/helpers/container'
import { truncateAll } from '../../../../tests/helpers/db'
import { seedUser, SEED } from '../../../../tests/helpers/userSeed'

const container = getTestContainer()
const handler = container.get(DeleteUserSelfHandler)
const loginHandler = container.get(LoginUserHandler)

describe('DeleteUserSelfHandler', () => {
  beforeEach(async () => {
    await truncateAll(container)
  })

  afterAll(async () => {
    await disconnectTestDb()
  })

  it('deletes user successfully', async () => {
    const { userId } = await seedUser(container)

    const result = await handler.execute(new DeleteUserSelfCommand(userId, SEED.user.password))

    expect(result.success).toBe(true)
  })

  it('login fails after deletion', async () => {
    const { userId, projectId } = await seedUser(container)

    await handler.execute(new DeleteUserSelfCommand(userId, SEED.user.password))

    await expect(
      loginHandler.execute(
        new LoginUserCommand(SEED.user.password, SEED.user.email, projectId, null, null, null),
      ),
    ).rejects.toThrow(UnauthorizedError)
  })

  it('throws UnauthorizedError for wrong password', async () => {
    const { userId } = await seedUser(container)

    await expect(
      handler.execute(new DeleteUserSelfCommand(userId, 'wrongpassword')),
    ).rejects.toThrow(UnauthorizedError)
  })
})
