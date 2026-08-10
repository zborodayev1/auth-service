import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { GetProjectApiKeyHandler } from './GetProjectApiKeyHandler'
import { GetProjectApiKeyQuery } from './GetProjectApiKeyQuery'
import { RotateApiKeyHandler } from '../../../commands/project/RotateApiKey/RotateApiKeyHandler'
import { RotateApiKeyCommand } from '../../../commands/project/RotateApiKey/RotateApiKeyCommand'
import { getTestContainer, disconnectTestDb } from '../../../../tests/helpers/container'
import { truncateAll } from '../../../../tests/helpers/db'
import { seedProject, PROJECT_SEED } from '../../../../tests/helpers/projectSeed'

const container = getTestContainer()
const handler = container.get(GetProjectApiKeyHandler)
const rotateKey = container.get(RotateApiKeyHandler)

describe('GetProjectApiKeyHandler', () => {
  beforeEach(async () => { await truncateAll(container) })
  afterAll(async () => { await disconnectTestDb() })

  it('returns api key with correct shape', async () => {
    const { clientId, projectId } = await seedProject(container)

    const result = await handler.execute(new GetProjectApiKeyQuery(projectId, clientId))

    expect(result.id).toBeTruthy()
    expect(result.name).toBe(PROJECT_SEED.project.name)
    expect(result.revoked).toBe(false)
    expect(result.createdAt).toBeInstanceOf(Date)
  })

  it('reflects new key name after rotation', async () => {
    const { clientId, projectId } = await seedProject(container)
    await rotateKey.execute(new RotateApiKeyCommand(clientId, projectId, 'new key name'))

    const result = await handler.execute(new GetProjectApiKeyQuery(projectId, clientId))

    expect(result.name).toBe('new key name')
  })
})
