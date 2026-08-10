import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { DeleteProjectFieldHandler } from './DeleteProjectFieldHandler'
import { DeleteProjectFieldCommand } from './DeleteProjectFieldCommand'
import { GetProjectFieldsHandler } from '../../../queries/project/GetProjectFields/GetProjectFieldsHandler'
import { GetProjectFieldsQuery } from '../../../queries/project/GetProjectFields/GetProjectFieldsQuery'
import { UpdateUserFieldHandler } from '../../user/UpdateUserField/UpdateUserFieldHandler'
import { UpdateUserFieldCommand } from '../../user/UpdateUserField/UpdateUserFieldCommand'
import { ConflictError } from '@shared/errors/ConflictError'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { getTestContainer, disconnectTestDb } from '../../../../tests/helpers/container'
import { truncateAll } from '../../../../tests/helpers/db'
import { seedProjectWithField } from '../../../../tests/helpers/projectSeed'
import { seedUser } from '../../../../tests/helpers/userSeed'
import { RegisterUserHandler } from '../../user/RegisterUser/RegisterUserHandler'
import { RegisterUserCommand } from '../../user/RegisterUser/RegisterUserCommand'

const container = getTestContainer()
const handler = container.get(DeleteProjectFieldHandler)
const getFields = container.get(GetProjectFieldsHandler)
const updateUserField = container.get(UpdateUserFieldHandler)
const registerUser = container.get(RegisterUserHandler)

describe('DeleteProjectFieldHandler', () => {
  beforeEach(async () => { await truncateAll(container) })
  afterAll(async () => { await disconnectTestDb() })

  it('deletes field with no user data', async () => {
    const { clientId, projectId, fieldId } = await seedProjectWithField(container)

    const result = await handler.execute(new DeleteProjectFieldCommand(fieldId, projectId, clientId, false))

    expect(result.success).toBe(true)
  })

  it('field no longer appears in list after delete', async () => {
    const { clientId, projectId, fieldId } = await seedProjectWithField(container)

    await handler.execute(new DeleteProjectFieldCommand(fieldId, projectId, clientId, false))

    const fields = await getFields.execute(new GetProjectFieldsQuery(projectId, clientId))
    expect(fields.find(f => f.id === fieldId)).toBeUndefined()
  })

  it('throws ConflictError when field has data and force=false', async () => {
    const { clientId, projectId, fieldId } = await seedProjectWithField(container)

    const { userId } = await registerUser.execute(
      new RegisterUserCommand(projectId, 'user@example.com', 'userpassword123', {}, null, null, null),
    )
    await updateUserField.execute(new UpdateUserFieldCommand(userId, projectId, fieldId, 'some value'))

    await expect(
      handler.execute(new DeleteProjectFieldCommand(fieldId, projectId, clientId, false)),
    ).rejects.toThrow(ConflictError)
  })

  it('deletes field with data when force=true', async () => {
    const { clientId, projectId, fieldId } = await seedProjectWithField(container)

    const { userId } = await registerUser.execute(
      new RegisterUserCommand(projectId, 'user@example.com', 'userpassword123', {}, null, null, null),
    )
    await updateUserField.execute(new UpdateUserFieldCommand(userId, projectId, fieldId, 'some value'))

    const result = await handler.execute(new DeleteProjectFieldCommand(fieldId, projectId, clientId, true))

    expect(result.success).toBe(true)
  })

  it('throws NotFoundError for unknown fieldId', async () => {
    const { clientId, projectId } = await seedProjectWithField(container)

    await expect(
      handler.execute(new DeleteProjectFieldCommand('00000000-0000-0000-0000-000000000000', projectId, clientId, false)),
    ).rejects.toThrow(NotFoundError)
  })
})
