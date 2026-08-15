import { beforeEach, describe, expect, it } from 'vitest'
import { CreateProjectHandler } from './CreateProjectHandler'
import { CreateProjectCommand } from './CreateProjectCommand'
import { RegisterClientHandler } from '../../client/RegisterClient/RegisterClientHandler'
import { RegisterClientCommand } from '../../client/RegisterClient/RegisterClientCommand'
import { getTestContainer } from '@tests/helpers/container'
import { truncateAll } from '@tests/helpers/db'
import { PROJECT_SEED } from '@tests/helpers/projectSeed'

const container = getTestContainer()
const handler = container.get(CreateProjectHandler)
const registerClient = container.get(RegisterClientHandler)

const seedClient = (): Promise<{ clientId: string }> =>
  registerClient.execute(
    new RegisterClientCommand(
      PROJECT_SEED.client.name,
      PROJECT_SEED.client.email,
      PROJECT_SEED.client.password,
      null,
      null,
      null,
    ),
  )

describe('CreateProjectHandler', () => {
  beforeEach(async () => {
    await truncateAll(container)
  })

  it('returns projectId and raw apiKey', async () => {
    const { clientId } = await seedClient()

    const result = await handler.execute(
      new CreateProjectCommand(PROJECT_SEED.project.name, clientId),
    )

    expect(result.projectId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    )
    expect(result.apiKey).toBeTruthy()
  })
})
