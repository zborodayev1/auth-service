import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { ChangeUserPasswordHandler } from './ChangeUserPasswordHandler'
import { ChangeUserPasswordCommand } from './ChangeUserPasswordCommand'
import { LoginUserHandler } from '../LoginUser/LoginUserHandler'
import { LoginUserCommand } from '../LoginUser/LoginUserCommand'
import { ConflictError } from '@shared/errors/ConflictError'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { getTestContainer, disconnectTestDb } from '../../../../tests/helpers/container'
import { truncateAll } from '../../../../tests/helpers/db'
import { seedUser, SEED } from '../../../../tests/helpers/userSeed'

const container = getTestContainer()
const handler = container.get(ChangeUserPasswordHandler)
const loginHandler = container.get(LoginUserHandler)

describe('ChangeUserPasswordHandler', () => {
  beforeEach(async () => {
    await truncateAll(container)
  })

  afterAll(async () => {
    await disconnectTestDb()
  })

  it('changes password successfully', async () => {
    const { userId, projectId } = await seedUser(container)

    const result = await handler.execute(
      new ChangeUserPasswordCommand(userId, projectId, SEED.user.password, 'newpassword456'),
    )

    expect(result.success).toBe(true)
  })

  it('new password works for login after change', async () => {
    const { userId, projectId } = await seedUser(container)

    await handler.execute(
      new ChangeUserPasswordCommand(userId, projectId, SEED.user.password, 'newpassword456'),
    )

    await expect(
      loginHandler.execute(new LoginUserCommand('newpassword456', SEED.user.email, projectId, null, null, null)),
    ).resolves.toBeTruthy()
  })

  it('old password no longer works after change', async () => {
    const { userId, projectId } = await seedUser(container)

    await handler.execute(
      new ChangeUserPasswordCommand(userId, projectId, SEED.user.password, 'newpassword456'),
    )

    await expect(
      loginHandler.execute(new LoginUserCommand(SEED.user.password, SEED.user.email, projectId, null, null, null)),
    ).rejects.toThrow(UnauthorizedError)
  })

  it('throws UnauthorizedError for wrong current password', async () => {
    const { userId, projectId } = await seedUser(container)

    await expect(
      handler.execute(new ChangeUserPasswordCommand(userId, projectId, 'wrongpassword', 'newpassword456')),
    ).rejects.toThrow(UnauthorizedError)
  })

  it('throws ConflictError when new password same as current', async () => {
    const { userId, projectId } = await seedUser(container)

    await expect(
      handler.execute(new ChangeUserPasswordCommand(userId, projectId, SEED.user.password, SEED.user.password)),
    ).rejects.toThrow(ConflictError)
  })
})
