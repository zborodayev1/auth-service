import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { UpdateProjectFieldHandler } from './UpdateProjectFieldHandler'
import { UpdateProjectFieldCommand } from './UpdateProjectFieldCommand'
import { GetProjectFieldsHandler } from '../../../queries/project/GetProjectFields/GetProjectFieldsHandler'
import { GetProjectFieldsQuery } from '../../../queries/project/GetProjectFields/GetProjectFieldsQuery'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { getTestContainer, disconnectTestDb } from '../../../../tests/helpers/container'
import { truncateAll } from '../../../../tests/helpers/db'
import { seedProjectWithField } from '../../../../tests/helpers/projectSeed'

const container = getTestContainer()
const handler = container.get(UpdateProjectFieldHandler)
const getFields = container.get(GetProjectFieldsHandler)

describe('UpdateProjectFieldHandler', () => {
  beforeEach(async () => { await truncateAll(container) })
  afterAll(async () => { await disconnectTestDb() })

  it('updates field name and persists', async () => {
    const { clientId, projectId, fieldId } = await seedProjectWithField(container)

    await handler.execute(new UpdateProjectFieldCommand(projectId, clientId, fieldId, 'updatedname', false, null, []))

    const fields = await getFields.execute(new GetProjectFieldsQuery(projectId, clientId))
    expect(fields[0]?.name).toBe('updatedname')
  })

  it('updates required flag', async () => {
    const { clientId, projectId, fieldId } = await seedProjectWithField(container)

    await handler.execute(new UpdateProjectFieldCommand(projectId, clientId, fieldId, 'biography', true, null, []))

    const fields = await getFields.execute(new GetProjectFieldsQuery(projectId, clientId))
    expect(fields[0]?.required).toBe(true)
  })

  it('throws NotFoundError for unknown fieldId', async () => {
    const { clientId, projectId } = await seedProjectWithField(container)

    await expect(
      handler.execute(new UpdateProjectFieldCommand(projectId, clientId, '00000000-0000-0000-0000-000000000000', 'name', false, null, [])),
    ).rejects.toThrow(NotFoundError)
  })
})
