import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { RotateApiKeyHandler } from './RotateApiKeyHandler'
import { RotateApiKeyCommand } from './RotateApiKeyCommand'
import { GetProjectApiKeyHandler } from '../../../queries/project/GetProjectApiKey/GetProjectApiKeyHandler'
import { GetProjectApiKeyQuery } from '../../../queries/project/GetProjectApiKey/GetProjectApiKeyQuery'
import { getTestContainer, disconnectTestDb } from '../../../../tests/helpers/container'
import { truncateAll } from '../../../../tests/helpers/db'
import { seedProject } from '../../../../tests/helpers/projectSeed'

const container = getTestContainer()
const handler = container.get(RotateApiKeyHandler)
const getApiKey = container.get(GetProjectApiKeyHandler)

describe('RotateApiKeyHandler', () => {
  beforeEach(async () => { await truncateAll(container) })
  afterAll(async () => { await disconnectTestDb() })

  it('returns new raw key', async () => {
    const { clientId, projectId } = await seedProject(container)

    const result = await handler.execute(new RotateApiKeyCommand(clientId, projectId))

    expect(result.rawKey).toBeTruthy()
    expect(typeof result.rawKey).toBe('string')
  })

  it('new key differs from original', async () => {
    const { clientId, projectId } = await seedProject(container)

    const before = await getApiKey.execute(new GetProjectApiKeyQuery(projectId, clientId))
    const { rawKey } = await handler.execute(new RotateApiKeyCommand(clientId, projectId))

    expect(rawKey).not.toBe(before.id)
  })

  it('accepts custom name for new key', async () => {
    const { clientId, projectId } = await seedProject(container)

    await handler.execute(new RotateApiKeyCommand(clientId, projectId, 'production key'))

    const apiKey = await getApiKey.execute(new GetProjectApiKeyQuery(projectId, clientId))
    expect(apiKey.name).toBe('production key')
  })
})
