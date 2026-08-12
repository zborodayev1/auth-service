import { beforeEach, describe, expect, it } from 'vitest'
import { ChangeUserPasswordHandler } from './ChangeUserPasswordHandler'
import { ChangeUserPasswordCommand } from './ChangeUserPasswordCommand'
import { LoginUserHandler } from '../LoginUser/LoginUserHandler'
import { LoginUserCommand } from '../LoginUser/LoginUserCommand'
import { ConflictError } from '@shared/errors/ConflictError'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { getTestContainer } from '../../../../tests/helpers/container'
import { truncateAll } from '../../../../tests/helpers/db'
import { seedUser, SEED } from '../../../../tests/helpers/userSeed'
import { CreateProjectHandler } from '../../project/CreateProject/CreateProjectHandler'
import { CreateProjectCommand } from '../../project/CreateProject/CreateProjectCommand'

const container = getTestContainer()
const handler = container.get(ChangeUserPasswordHandler)
const loginHandler = container.get(LoginUserHandler)
const createProject = container.get(CreateProjectHandler)

describe('ChangeUserPasswordHandler', () => {
  beforeEach(async () => {
    await truncateAll(container)
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
      loginHandler.execute(
        new LoginUserCommand('newpassword456', SEED.user.email, projectId, null, null, null),
      ),
    ).resolves.toBeTruthy()
  })

  it('old password no longer works after change', async () => {
    const { userId, projectId } = await seedUser(container)

    await handler.execute(
      new ChangeUserPasswordCommand(userId, projectId, SEED.user.password, 'newpassword456'),
    )

    await expect(
      loginHandler.execute(
        new LoginUserCommand(SEED.user.password, SEED.user.email, projectId, null, null, null),
      ),
    ).rejects.toThrow(UnauthorizedError)
  })

  it('throws UnauthorizedError for wrong current password', async () => {
    const { userId, projectId } = await seedUser(container)

    await expect(
      handler.execute(
        new ChangeUserPasswordCommand(userId, projectId, 'wrongpassword', 'newpassword456'),
      ),
    ).rejects.toThrow(UnauthorizedError)
  })

  it('throws ConflictError when new password same as current', async () => {
    const { userId, projectId } = await seedUser(container)

    await expect(
      handler.execute(
        new ChangeUserPasswordCommand(userId, projectId, SEED.user.password, SEED.user.password),
      ),
    ).rejects.toThrow(ConflictError)
  })

  it('throws NotFoundError when projectId does not match user project', async () => {
    const { userId, clientId } = await seedUser(container)
    const { projectId: otherProjectId } = await createProject.execute(
      new CreateProjectCommand('Other Project', clientId),
    )

    await expect(
      handler.execute(
        new ChangeUserPasswordCommand(userId, otherProjectId, SEED.user.password, 'newpassword456'),
      ),
    ).rejects.toThrow(NotFoundError)
  })
})
