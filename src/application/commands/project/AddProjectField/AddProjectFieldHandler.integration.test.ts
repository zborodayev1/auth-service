import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { AddProjectFieldHandler } from './AddProjectFieldHandler'
import { AddProjectFieldCommand } from './AddProjectFieldCommand'
import { GetProjectFieldsHandler } from '../../../queries/project/GetProjectFields/GetProjectFieldsHandler'
import { GetProjectFieldsQuery } from '../../../queries/project/GetProjectFields/GetProjectFieldsQuery'
import { ConflictError } from '@shared/errors/ConflictError'
import { getTestContainer, disconnectTestDb } from '../../../../tests/helpers/container'
import { truncateAll } from '../../../../tests/helpers/db'
import { seedProject, PROJECT_SEED } from '../../../../tests/helpers/projectSeed'

const container = getTestContainer()
const handler = container.get(AddProjectFieldHandler)
const getFields = container.get(GetProjectFieldsHandler)

const addField = (clientId: string, projectId: string, name = PROJECT_SEED.field.name) =>
  handler.execute(new AddProjectFieldCommand(projectId, clientId, name, 'string', false, null, []))

describe('AddProjectFieldHandler', () => {
  beforeEach(async () => { await truncateAll(container) })
  afterAll(async () => { await disconnectTestDb() })

  it('returns fieldId', async () => {
    const { clientId, projectId } = await seedProject(container)

    const result = await addField(clientId, projectId)

    expect(result.fieldId).toBeTruthy()
  })

  it('field appears in project fields list', async () => {
    const { clientId, projectId } = await seedProject(container)

    const { fieldId } = await addField(clientId, projectId)

    const fields = await getFields.execute(new GetProjectFieldsQuery(projectId, clientId))
    expect(fields.some(f => f.id === fieldId)).toBe(true)
  })

  it('throws ConflictError on duplicate field name', async () => {
    const { clientId, projectId } = await seedProject(container)

    await addField(clientId, projectId)

    await expect(addField(clientId, projectId)).rejects.toThrow(ConflictError)
  })

  it('allows different field names in same project', async () => {
    const { clientId, projectId } = await seedProject(container)

    await addField(clientId, projectId, 'biography')
    await expect(addField(clientId, projectId, 'username1')).resolves.toBeTruthy()
  })
})
