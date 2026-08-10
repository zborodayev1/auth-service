import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { RenameApiKeyHandler } from './RenameApiKeyHandler'
import { RenameApiKeyCommand } from './RenameApiKeyCommand'
import { GetProjectApiKeyHandler } from '../../../queries/project/GetProjectApiKey/GetProjectApiKeyHandler'
import { GetProjectApiKeyQuery } from '../../../queries/project/GetProjectApiKey/GetProjectApiKeyQuery'
import { getTestContainer, disconnectTestDb } from '../../../../tests/helpers/container'
import { truncateAll } from '../../../../tests/helpers/db'
import { seedProject } from '../../../../tests/helpers/projectSeed'

const container = getTestContainer()
const handler = container.get(RenameApiKeyHandler)
const getApiKey = container.get(GetProjectApiKeyHandler)

describe('RenameApiKeyHandler', () => {
  beforeEach(async () => { await truncateAll(container) })
  afterAll(async () => { await disconnectTestDb() })

  it('renames api key successfully', async () => {
    const { clientId, projectId } = await seedProject(container)

    const result = await handler.execute(new RenameApiKeyCommand(clientId, projectId, 'production key'))

    expect(result.name).toBe('production key')
  })

  it('persists new name', async () => {
    const { clientId, projectId } = await seedProject(container)

    await handler.execute(new RenameApiKeyCommand(clientId, projectId, 'production key'))

    const apiKey = await getApiKey.execute(new GetProjectApiKeyQuery(projectId, clientId))
    expect(apiKey.name).toBe('production key')
  })
})
