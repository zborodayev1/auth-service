import { beforeEach, describe, expect, it } from 'vitest'
import { DeleteProjectUserHandler } from './DeleteProjectUserHandler'
import { DeleteProjectUserCommand } from './DeleteProjectUserCommand'
import { LoginUserHandler } from '../../user/LoginUser/LoginUserHandler'
import { LoginUserCommand } from '../../user/LoginUser/LoginUserCommand'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { getTestContainer } from '@tests/helpers/container'
import { truncateAll } from '@tests/helpers/db'
import { seedUser, SEED } from '@tests/helpers/userSeed'
import { NotFoundError } from '@shared/errors/NotFoundError'

const container = getTestContainer()
const handler = container.get(DeleteProjectUserHandler)
const loginUser = container.get(LoginUserHandler)

describe('DeleteProjectUserHandler', () => {
  beforeEach(async () => {
    await truncateAll(container)
  })

  it('deletes user successfully', async () => {
    const { clientId, userId } = await seedUser(container)

    const result = await handler.execute(new DeleteProjectUserCommand(clientId, userId))

    expect(result.success).toBe(true)
  })

  it('user cannot login after deletion', async () => {
    const { clientId, projectId, userId } = await seedUser(container)

    await handler.execute(new DeleteProjectUserCommand(clientId, userId))

    await expect(
      loginUser.execute(
        new LoginUserCommand(SEED.user.password, SEED.user.email, projectId, null, null, null),
      ),
    ).rejects.toThrow(UnauthorizedError)
  })
  it('throws NotFoundError when clientId does not own the user project', async () => {
    const { userId } = await seedUser(container)

    await expect(
      handler.execute(new DeleteProjectUserCommand('00000000-0000-0000-0000-000000000000', userId)),
    ).rejects.toThrow(NotFoundError)
  })
})
