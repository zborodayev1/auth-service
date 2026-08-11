import { beforeEach, describe, expect, it } from 'vitest'
import { UpdateProjectFieldHandler } from './UpdateProjectFieldHandler'
import { UpdateProjectFieldCommand } from './UpdateProjectFieldCommand'
import { GetProjectFieldsHandler } from '../../../queries/project/GetProjectFields/GetProjectFieldsHandler'
import { GetProjectFieldsQuery } from '../../../queries/project/GetProjectFields/GetProjectFieldsQuery'
import { ConflictError } from '@shared/errors/ConflictError'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { getTestContainer } from '../../../../tests/helpers/container'
import { truncateAll } from '../../../../tests/helpers/db'
import { seedProjectWithField, PROJECT_SEED } from '../../../../tests/helpers/projectSeed'
import { AddProjectFieldHandler } from '../AddProjectField/AddProjectFieldHandler'
import { AddProjectFieldCommand } from '../AddProjectField/AddProjectFieldCommand'

const container = getTestContainer()
const handler = container.get(UpdateProjectFieldHandler)
const getFields = container.get(GetProjectFieldsHandler)
const addField = container.get(AddProjectFieldHandler)

describe('UpdateProjectFieldHandler', () => {
  beforeEach(async () => {
    await truncateAll(container)
  })

  it('updates field name and persists', async () => {
    const { clientId, projectId, fieldId } = await seedProjectWithField(container)

    await handler.execute(
      new UpdateProjectFieldCommand(projectId, clientId, fieldId, 'updatedname', false, null, []),
    )

    const fields = await getFields.execute(new GetProjectFieldsQuery(projectId, clientId))
    expect(fields[0]?.name).toBe('updatedname')
  })

  it('updates required flag', async () => {
    const { clientId, projectId, fieldId } = await seedProjectWithField(container)

    await handler.execute(
      new UpdateProjectFieldCommand(projectId, clientId, fieldId, 'biography', true, null, []),
    )

    const fields = await getFields.execute(new GetProjectFieldsQuery(projectId, clientId))
    expect(fields[0]?.required).toBe(true)
  })

  it('throws NotFoundError when clientId does not own the field', async () => {
    const { projectId, fieldId } = await seedProjectWithField(container)

    await expect(
      handler.execute(
        new UpdateProjectFieldCommand(
          projectId,
          '00000000-0000-0000-0000-000000000000',
          fieldId,
          'hackname',
          false,
          null,
          [],
        ),
      ),
    ).rejects.toThrow(NotFoundError)
  })

  it('throws ConflictError when renaming to an existing field name', async () => {
    const { clientId, projectId, fieldId } = await seedProjectWithField(container)

    await addField.execute(
      new AddProjectFieldCommand(projectId, clientId, 'othername', 'string', false, null, []),
    )

    await expect(
      handler.execute(
        new UpdateProjectFieldCommand(projectId, clientId, fieldId, 'othername', false, null, []),
      ),
    ).rejects.toThrow(ConflictError)
  })

  it('allows renaming a field to its own current name', async () => {
    const { clientId, projectId, fieldId } = await seedProjectWithField(container)

    await expect(
      handler.execute(
        new UpdateProjectFieldCommand(projectId, clientId, fieldId, PROJECT_SEED.field.name, false, null, []),
      ),
    ).resolves.toBeTruthy()
  })

  it('throws NotFoundError for unknown fieldId', async () => {
    const { clientId, projectId } = await seedProjectWithField(container)

    await expect(
      handler.execute(
        new UpdateProjectFieldCommand(
          projectId,
          clientId,
          '00000000-0000-0000-0000-000000000000',
          'name',
          false,
          null,
          [],
        ),
      ),
    ).rejects.toThrow(NotFoundError)
  })
})
