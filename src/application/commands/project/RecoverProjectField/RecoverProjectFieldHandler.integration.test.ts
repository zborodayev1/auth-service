import { beforeEach, describe, expect, it } from 'vitest'
import { RecoverProjectFieldHandler } from './RecoverProjectFieldHandler'
import { RecoverProjectFieldCommand } from './RecoverProjectFieldCommand'
import { DeleteProjectFieldHandler } from '../DeleteProjectField/DeleteProjectFieldHandler'
import { DeleteProjectFieldCommand } from '../DeleteProjectField/DeleteProjectFieldCommand'
import { GetProjectFieldsHandler } from '../../../queries/project/GetProjectFields/GetProjectFieldsHandler'
import { GetProjectFieldsQuery } from '../../../queries/project/GetProjectFields/GetProjectFieldsQuery'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { getTestContainer } from '@tests/helpers/container'
import { truncateAll } from '@tests/helpers/db'
import { seedProjectWithField } from '@tests/helpers/projectSeed'

const container = getTestContainer()
const handler = container.get(RecoverProjectFieldHandler)
const deleteField = container.get(DeleteProjectFieldHandler)
const getFields = container.get(GetProjectFieldsHandler)

describe('RecoverProjectFieldHandler', () => {
  beforeEach(async () => {
    await truncateAll(container)
  })

  it('recovers soft-deleted field', async () => {
    const { clientId, projectId, fieldId } = await seedProjectWithField(container)

    await deleteField.execute(new DeleteProjectFieldCommand(fieldId, projectId, clientId, false))
    const result = await handler.execute(
      new RecoverProjectFieldCommand(projectId, fieldId, clientId),
    )

    expect(result.fieldId).toBe(fieldId)
  })

  it('field appears in list after recovery', async () => {
    const { clientId, projectId, fieldId } = await seedProjectWithField(container)

    await deleteField.execute(new DeleteProjectFieldCommand(fieldId, projectId, clientId, false))
    await handler.execute(new RecoverProjectFieldCommand(projectId, fieldId, clientId))

    const fields = await getFields.execute(new GetProjectFieldsQuery(projectId, clientId))
    expect(fields.some((f) => f.id === fieldId)).toBe(true)
  })

  it('throws NotFoundError for non-deleted field', async () => {
    const { clientId, projectId, fieldId } = await seedProjectWithField(container)

    await expect(
      handler.execute(new RecoverProjectFieldCommand(projectId, fieldId, clientId)),
    ).rejects.toThrow(NotFoundError)
  })

  it('throws NotFoundError when clientId does not own the project', async () => {
    const { clientId, projectId, fieldId } = await seedProjectWithField(container)

    await deleteField.execute(new DeleteProjectFieldCommand(fieldId, projectId, clientId, false))

    await expect(
      handler.execute(
        new RecoverProjectFieldCommand(projectId, fieldId, '00000000-0000-0000-0000-000000000000'),
      ),
    ).rejects.toThrow(NotFoundError)
  })
})
