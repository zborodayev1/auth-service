import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { CreateProjectHandler } from './CreateProjectHandler'
import { CreateProjectCommand } from './CreateProjectCommand'
import { RegisterClientHandler } from '../../client/RegisterClient/RegisterClientHandler'
import { RegisterClientCommand } from '../../client/RegisterClient/RegisterClientCommand'
import { getTestContainer, disconnectTestDb } from '../../../../tests/helpers/container'
import { truncateAll } from '../../../../tests/helpers/db'
import { PROJECT_SEED } from '../../../../tests/helpers/projectSeed'

const container = getTestContainer()
const handler = container.get(CreateProjectHandler)
const registerClient = container.get(RegisterClientHandler)

const seedClient = (): Promise<{ clientId: string }> =>
  registerClient.execute(
    new RegisterClientCommand(PROJECT_SEED.client.name, PROJECT_SEED.client.email, PROJECT_SEED.client.password, null, null, null),
  )

describe('CreateProjectHandler', () => {
  beforeEach(async () => { await truncateAll(container) })
  afterAll(async () => { await disconnectTestDb() })

  it('returns projectId and raw apiKey', async () => {
    const { clientId } = await seedClient()

    const result = await handler.execute(new CreateProjectCommand(PROJECT_SEED.project.name, clientId))

    expect(result.projectId).toBeTruthy()
    expect(result.apiKey).toBeTruthy()
  })

  it('raw apiKey is a non-empty string', async () => {
    const { clientId } = await seedClient()

    const { apiKey } = await handler.execute(new CreateProjectCommand(PROJECT_SEED.project.name, clientId))

    expect(typeof apiKey).toBe('string')
    expect(apiKey.length).toBeGreaterThan(0)
  })
})
