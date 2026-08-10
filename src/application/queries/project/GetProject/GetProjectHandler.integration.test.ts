import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { GetProjectHandler } from './GetProjectHandler'
import { GetProjectQuery } from './GetProjectQuery'
import { AddProjectFieldHandler } from '../../../commands/project/AddProjectField/AddProjectFieldHandler'
import { AddProjectFieldCommand } from '../../../commands/project/AddProjectField/AddProjectFieldCommand'
import { getTestContainer, disconnectTestDb } from '../../../../tests/helpers/container'
import { truncateAll } from '../../../../tests/helpers/db'
import { seedProject, PROJECT_SEED } from '../../../../tests/helpers/projectSeed'

const container = getTestContainer()
const handler = container.get(GetProjectHandler)
const addField = container.get(AddProjectFieldHandler)

describe('GetProjectHandler', () => {
  beforeEach(async () => { await truncateAll(container) })
  afterAll(async () => { await disconnectTestDb() })

  it('returns correct project fields', async () => {
    const { clientId, projectId } = await seedProject(container)

    const result = await handler.execute(new GetProjectQuery(projectId, clientId))

    expect(result.id).toBe(projectId)
    expect(result.name).toBe(PROJECT_SEED.project.name)
    expect(result.fieldCount).toBe(0)
    expect(result.apiKey.revoked).toBe(false)
    expect(result.createdAt).toBeInstanceOf(Date)
  })

  it('fieldCount reflects added fields', async () => {
    const { clientId, projectId } = await seedProject(container)
    await addField.execute(new AddProjectFieldCommand(projectId, clientId, 'biography', 'string', false, null, []))
    await addField.execute(new AddProjectFieldCommand(projectId, clientId, 'username1', 'string', false, null, []))

    const result = await handler.execute(new GetProjectQuery(projectId, clientId))

    expect(result.fieldCount).toBe(2)
  })
})
