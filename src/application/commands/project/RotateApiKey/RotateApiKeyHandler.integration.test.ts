import { beforeEach, describe, expect, it } from 'vitest'
import { RotateApiKeyHandler } from './RotateApiKeyHandler'
import { RotateApiKeyCommand } from './RotateApiKeyCommand'
import { GetProjectApiKeyHandler } from '../../../queries/project/GetProjectApiKey/GetProjectApiKeyHandler'
import { GetProjectApiKeyQuery } from '../../../queries/project/GetProjectApiKey/GetProjectApiKeyQuery'
import { getTestContainer } from '@tests/helpers/container'
import { truncateAll } from '@tests/helpers/db'
import { seedProject } from '@tests/helpers/projectSeed'
import { NotFoundError } from '@shared/errors/NotFoundError'

const container = getTestContainer()
const handler = container.get(RotateApiKeyHandler)
const getApiKey = container.get(GetProjectApiKeyHandler)

describe('RotateApiKeyHandler', () => {
  beforeEach(async () => {
    await truncateAll(container)
  })

  it('returns new raw key', async () => {
    const { clientId, projectId } = await seedProject(container)

    const result = await handler.execute(new RotateApiKeyCommand(clientId, projectId))

    expect(result.rawKey).toBeTruthy()
    expect(typeof result.rawKey).toBe('string')
  })

  it('new key differs from original', async () => {
    const { clientId, projectId } = await seedProject(container)

    const { rawKey: first } = await handler.execute(new RotateApiKeyCommand(clientId, projectId))
    const { rawKey: second } = await handler.execute(new RotateApiKeyCommand(clientId, projectId))

    expect(first).not.toBe(second)
  })

  it('accepts custom name for new key', async () => {
    const { clientId, projectId } = await seedProject(container)

    await handler.execute(new RotateApiKeyCommand(clientId, projectId, 'production key'))

    const apiKey = await getApiKey.execute(new GetProjectApiKeyQuery(projectId, clientId))
    expect(apiKey.name).toBe('production key')
  })

  it('throws NotFoundError when clientId does not own the project', async () => {
    const { projectId } = await seedProject(container)

    await expect(
      handler.execute(new RotateApiKeyCommand('00000000-0000-0000-0000-000000000000', projectId)),
    ).rejects.toThrow(NotFoundError)
  })
})
