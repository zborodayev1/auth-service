import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { GetClientProjectsHandler } from './GetClientProjectsHandler'
import { GetClientProjectsQuery } from './GetClientProjectsQuery'
import { RegisterClientHandler } from '../../../commands/client/RegisterClient/RegisterClientHandler'
import { RegisterClientCommand } from '../../../commands/client/RegisterClient/RegisterClientCommand'
import { CreateProjectHandler } from '../../../commands/project/CreateProject/CreateProjectHandler'
import { CreateProjectCommand } from '../../../commands/project/CreateProject/CreateProjectCommand'
import { getTestContainer, disconnectTestDb } from '../../../../tests/helpers/container'
import { truncateAll } from '../../../../tests/helpers/db'
import { SEED } from '../../../../tests/helpers/userSeed'

const container = getTestContainer()
const handler = container.get(GetClientProjectsHandler)
const registerClient = container.get(RegisterClientHandler)
const createProject = container.get(CreateProjectHandler)

const seedClient = (): Promise<{ clientId: string }> =>
  registerClient.execute(
    new RegisterClientCommand(SEED.client.name, SEED.client.email, SEED.client.password, null, null, null),
  )

describe('GetClientProjectsHandler', () => {
  beforeEach(async () => {
    await truncateAll(container)
  })

  afterAll(async () => {
    await disconnectTestDb()
  })

  it('returns empty array when client has no projects', async () => {
    const { clientId } = await seedClient()

    const result = await handler.execute(new GetClientProjectsQuery(clientId))

    expect(result).toEqual([])
  })

  it('returns projects with correct shape', async () => {
    const { clientId } = await seedClient()
    await createProject.execute(new CreateProjectCommand(SEED.project.name, clientId))

    const result = await handler.execute(new GetClientProjectsQuery(clientId))

    expect(result).toHaveLength(1)
    expect(result[0]?.name).toBe(SEED.project.name)
    expect(result[0]?.id).toBeTruthy()
    expect(result[0]?.apiKey.revoked).toBe(false)
    expect(result[0]?.createdAt).toBeInstanceOf(Date)
  })

  it('returns multiple projects', async () => {
    const { clientId } = await seedClient()
    await createProject.execute(new CreateProjectCommand(SEED.project.name, clientId))
    await createProject.execute(new CreateProjectCommand('Second Project', clientId))

    const result = await handler.execute(new GetClientProjectsQuery(clientId))

    expect(result).toHaveLength(2)
  })

  it('only returns projects owned by the querying client', async () => {
    const { clientId } = await seedClient()
    const { clientId: otherId } = await registerClient.execute(
      new RegisterClientCommand('Other Client', 'other@example.com', SEED.client.password, null, null, null),
    )

    await createProject.execute(new CreateProjectCommand(SEED.project.name, clientId))
    await createProject.execute(new CreateProjectCommand('Other Project', otherId))

    const result = await handler.execute(new GetClientProjectsQuery(clientId))

    expect(result).toHaveLength(1)
    expect(result[0]?.name).toBe(SEED.project.name)
  })
})
