import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { RegisterUserHandler } from './RegisterUserHandler'
import { RegisterUserCommand } from './RegisterUserCommand'
import { CreateProjectHandler } from '../../project/CreateProject/CreateProjectHandler'
import { CreateProjectCommand } from '../../project/CreateProject/CreateProjectCommand'
import { RegisterClientHandler } from '../../client/RegisterClient/RegisterClientHandler'
import { RegisterClientCommand } from '../../client/RegisterClient/RegisterClientCommand'
import { ConflictError } from '@shared/errors/ConflictError'
import { getTestContainer, disconnectTestDb } from '../../../../tests/helpers/container'
import { truncateAll } from '../../../../tests/helpers/db'
import { SEED } from '../../../../tests/helpers/userSeed'

const container = getTestContainer()
const handler = container.get(RegisterUserHandler)
const registerClient = container.get(RegisterClientHandler)
const createProject = container.get(CreateProjectHandler)

const setupProject = async (): Promise<string> => {
  const { clientId } = await registerClient.execute(
    new RegisterClientCommand(SEED.client.name, SEED.client.email, SEED.client.password, null, null, null),
  )
  const { projectId } = await createProject.execute(new CreateProjectCommand(SEED.project.name, clientId))
  return projectId
}

describe('RegisterUserHandler', () => {
  beforeEach(async () => {
    await truncateAll(container)
  })

  afterAll(async () => {
    await disconnectTestDb()
  })

  it('returns userId, accessToken, refreshToken', async () => {
    const projectId = await setupProject()

    const result = await handler.execute(
      new RegisterUserCommand(projectId, SEED.user.email, SEED.user.password, {}, null, null, null),
    )

    expect(result.userId).toBeTruthy()
    expect(result.accessToken).toBeTruthy()
    expect(result.refreshToken).toBeTruthy()
  })

  it('throws ConflictError on duplicate email in same project', async () => {
    const projectId = await setupProject()

    await handler.execute(
      new RegisterUserCommand(projectId, SEED.user.email, SEED.user.password, {}, null, null, null),
    )

    await expect(
      handler.execute(
        new RegisterUserCommand(projectId, SEED.user.email, SEED.user.password, {}, null, null, null),
      ),
    ).rejects.toThrow(ConflictError)
  })

  it('allows same email in different projects', async () => {
    const projectId1 = await setupProject()

    const { clientId: clientId2 } = await registerClient.execute(
      new RegisterClientCommand('Other Client', 'other@example.com', SEED.client.password, null, null, null),
    )
    const { projectId: projectId2 } = await createProject.execute(
      new CreateProjectCommand('Other Project', clientId2),
    )

    await handler.execute(
      new RegisterUserCommand(projectId1, SEED.user.email, SEED.user.password, {}, null, null, null),
    )

    await expect(
      handler.execute(
        new RegisterUserCommand(projectId2, SEED.user.email, SEED.user.password, {}, null, null, null),
      ),
    ).resolves.toBeTruthy()
  })
})
