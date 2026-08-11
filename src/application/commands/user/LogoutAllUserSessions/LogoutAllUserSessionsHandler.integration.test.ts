import { beforeEach, describe, expect, it } from 'vitest'
import { LogoutAllUserSessionsHandler } from './LogoutAllUserSessionsHandler'
import { LogoutAllUserSessionsCommand } from './LogoutAllUserSessionsCommand'
import { RefreshUserAccessTokenHandler } from '../RefreshUserAccessToken/RefreshUserAccessTokenHandler'
import { RefreshUserAccessTokenCommand } from '../RefreshUserAccessToken/RefreshUserAccessTokenCommand'
import { LoginUserHandler } from '../LoginUser/LoginUserHandler'
import { LoginUserCommand } from '../LoginUser/LoginUserCommand'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { getTestContainer } from '../../../../tests/helpers/container'
import { truncateAll } from '../../../../tests/helpers/db'
import { seedUser, SEED } from '../../../../tests/helpers/userSeed'
import { CreateProjectHandler } from '../../project/CreateProject/CreateProjectHandler'
import { CreateProjectCommand } from '../../project/CreateProject/CreateProjectCommand'
import { RegisterUserHandler } from '../RegisterUser/RegisterUserHandler'
import { RegisterUserCommand } from '../RegisterUser/RegisterUserCommand'

const container = getTestContainer()
const handler = container.get(LogoutAllUserSessionsHandler)
const loginHandler = container.get(LoginUserHandler)
const refreshHandler = container.get(RefreshUserAccessTokenHandler)
const createProject = container.get(CreateProjectHandler)
const registerUser = container.get(RegisterUserHandler)

describe('LogoutAllUserSessionsHandler', () => {
  beforeEach(async () => {
    await truncateAll(container)
  })


  it('returns success', async () => {
    const { userId, projectId } = await seedUser(container)

    const result = await handler.execute(new LogoutAllUserSessionsCommand(userId, projectId))

    expect(result.success).toBe(true)
  })

  it('invalidates all sessions — refresh fails for all tokens', async () => {
    const { userId, projectId, refreshToken: token1 } = await seedUser(container)

    const { refreshToken: token2 } = await loginHandler.execute(
      new LoginUserCommand(SEED.user.password, SEED.user.email, projectId, null, null, null),
    )

    await handler.execute(new LogoutAllUserSessionsCommand(userId, projectId))

    await expect(
      refreshHandler.execute(new RefreshUserAccessTokenCommand(token1)),
    ).rejects.toThrow(UnauthorizedError)

    await expect(
      refreshHandler.execute(new RefreshUserAccessTokenCommand(token2)),
    ).rejects.toThrow(UnauthorizedError)
  })

  it('throws NotFoundError when userId does not belong to projectId', async () => {
    const { userId, clientId } = await seedUser(container)
    const { projectId: otherProjectId } = await createProject.execute(
      new CreateProjectCommand('Other Project', clientId),
    )

    await expect(
      handler.execute(new LogoutAllUserSessionsCommand(userId, otherProjectId)),
    ).rejects.toThrow(NotFoundError)
  })

  it('does not invalidate sessions of users in other projects', async () => {
    const { userId, projectId, clientId } = await seedUser(container)

    const { projectId: otherProjectId } = await createProject.execute(
      new CreateProjectCommand('Other Project', clientId),
    )
    const { refreshToken: otherToken } = await registerUser.execute(
      new RegisterUserCommand(otherProjectId, 'other@example.com', SEED.user.password, {}, null, null, null),
    )

    await handler.execute(new LogoutAllUserSessionsCommand(userId, projectId))

    await expect(
      refreshHandler.execute(new RefreshUserAccessTokenCommand(otherToken)),
    ).resolves.toBeTruthy()
  })
})
