import { beforeEach, describe, expect, it } from 'vitest'
import { DeleteUserSelfHandler } from './DeleteUserSelfHandler'
import { DeleteUserSelfCommand } from './DeleteUserSelfCommand'
import { LoginUserHandler } from '../LoginUser/LoginUserHandler'
import { LoginUserCommand } from '../LoginUser/LoginUserCommand'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { getTestContainer } from '@tests/helpers/container'
import { truncateAll } from '@tests/helpers/db'
import { seedUser, SEED } from '@tests/helpers/userSeed'
import { CreateProjectHandler } from '../../project/CreateProject/CreateProjectHandler'
import { CreateProjectCommand } from '../../project/CreateProject/CreateProjectCommand'

const container = getTestContainer()
const handler = container.get(DeleteUserSelfHandler)
const loginHandler = container.get(LoginUserHandler)
const createProject = container.get(CreateProjectHandler)

describe('DeleteUserSelfHandler', () => {
  beforeEach(async () => {
    await truncateAll(container)
  })

  it('deletes user successfully', async () => {
    const { userId, projectId } = await seedUser(container)

    const result = await handler.execute(
      new DeleteUserSelfCommand(userId, SEED.user.password, projectId),
    )

    expect(result.success).toBe(true)
  })

  it('login fails after deletion', async () => {
    const { userId, projectId } = await seedUser(container)

    await handler.execute(new DeleteUserSelfCommand(userId, SEED.user.password, projectId))

    await expect(
      loginHandler.execute(
        new LoginUserCommand(SEED.user.password, SEED.user.email, projectId, null, null, null),
      ),
    ).rejects.toThrow(UnauthorizedError)
  })

  it('throws UnauthorizedError for wrong password', async () => {
    const { userId, projectId } = await seedUser(container)

    await expect(
      handler.execute(new DeleteUserSelfCommand(userId, 'wrongpassword', projectId)),
    ).rejects.toThrow(UnauthorizedError)
  })

  it('throws NotFoundError when projectId does not match user project', async () => {
    const { userId, clientId } = await seedUser(container)
    const { projectId: otherProjectId } = await createProject.execute(
      new CreateProjectCommand('Other Project', clientId),
    )

    await expect(
      handler.execute(new DeleteUserSelfCommand(userId, SEED.user.password, otherProjectId)),
    ).rejects.toThrow(NotFoundError)
  })
})
