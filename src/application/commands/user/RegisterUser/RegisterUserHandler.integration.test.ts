import { beforeEach, describe, expect, it } from 'vitest'
import { RegisterUserHandler } from './RegisterUserHandler'
import { RegisterUserCommand } from './RegisterUserCommand'
import { CreateProjectHandler } from '../../project/CreateProject/CreateProjectHandler'
import { CreateProjectCommand } from '../../project/CreateProject/CreateProjectCommand'
import { RegisterClientHandler } from '../../client/RegisterClient/RegisterClientHandler'
import { RegisterClientCommand } from '../../client/RegisterClient/RegisterClientCommand'
import { ConflictError } from '@shared/errors/ConflictError'
import { getTestContainer } from '@tests/helpers/container'
import { truncateAll } from '@tests/helpers/db'
import { SEED } from '@tests/helpers/userSeed'
import { seedProject } from '@tests/helpers/projectSeed'

const container = getTestContainer()
const handler = container.get(RegisterUserHandler)
const registerClient = container.get(RegisterClientHandler)
const createProject = container.get(CreateProjectHandler)

describe('RegisterUserHandler', () => {
  beforeEach(async () => {
    await truncateAll(container)
  })

  it('returns userId, accessToken, refreshToken', async () => {
    const { projectId } = await seedProject(container)

    const result = await handler.execute(
      new RegisterUserCommand(projectId, SEED.user.email, SEED.user.password, {}, null, null, null),
    )

    expect(result.userId).toBeTruthy()
    expect(result.accessToken).toBeTruthy()
    expect(result.refreshToken).toBeTruthy()
  })

  it('throws ConflictError on duplicate email in same project', async () => {
    const { projectId } = await seedProject(container)

    await handler.execute(
      new RegisterUserCommand(projectId, SEED.user.email, SEED.user.password, {}, null, null, null),
    )

    await expect(
      handler.execute(
        new RegisterUserCommand(
          projectId,
          SEED.user.email,
          SEED.user.password,
          {},
          null,
          null,
          null,
        ),
      ),
    ).rejects.toThrow(ConflictError)
  })

  it('allows same email in different projects', async () => {
    const { projectId: projectId1 } = await seedProject(container)

    const { clientId: clientId2 } = await registerClient.execute(
      new RegisterClientCommand(
        'Other Client',
        'other@example.com',
        SEED.client.password,
        null,
        null,
        null,
      ),
    )
    const { projectId: projectId2 } = await createProject.execute(
      new CreateProjectCommand('Other Project', clientId2),
    )

    await handler.execute(
      new RegisterUserCommand(
        projectId1,
        SEED.user.email,
        SEED.user.password,
        {},
        null,
        null,
        null,
      ),
    )

    await expect(
      handler.execute(
        new RegisterUserCommand(
          projectId2,
          SEED.user.email,
          SEED.user.password,
          {},
          null,
          null,
          null,
        ),
      ),
    ).resolves.toBeTruthy()
  })
})
