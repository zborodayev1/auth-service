import { beforeEach, describe, expect, it } from 'vitest'
import { UpdateProjectUserFieldHandler } from './UpdateProjectUserFieldHandler'
import { UpdateProjectUserFieldCommand } from './UpdateProjectUserFieldCommand'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { getTestContainer } from '../../../../tests/helpers/container'
import { truncateAll } from '../../../../tests/helpers/db'
import { seedUser } from '../../../../tests/helpers/userSeed'
import { seedProject } from '../../../../tests/helpers/projectSeed'
import { RegisterUserHandler } from '../../user/RegisterUser/RegisterUserHandler'
import { RegisterUserCommand } from '../../user/RegisterUser/RegisterUserCommand'
import { AddProjectFieldHandler } from '../AddProjectField/AddProjectFieldHandler'
import { AddProjectFieldCommand } from '../AddProjectField/AddProjectFieldCommand'

const container = getTestContainer()
const handler = container.get(UpdateProjectUserFieldHandler)
const registerUser = container.get(RegisterUserHandler)
const addField = container.get(AddProjectFieldHandler)

describe('UpdateProjectUserFieldHandler', () => {
  beforeEach(async () => {
    await truncateAll(container)
  })

  it('updates user field value as client admin', async () => {
    const { clientId, projectId } = await seedProject(container)
    const { fieldId } = await addField.execute(
      new AddProjectFieldCommand(projectId, clientId, 'nickname1', 'string', false, null, []),
    )
    const { userId } = await registerUser.execute(
      new RegisterUserCommand(
        projectId,
        'user@example.com',
        'userpassword123',
        {},
        null,
        null,
        null,
      ),
    )

    const result = await handler.execute(
      new UpdateProjectUserFieldCommand(clientId, userId, fieldId, 'admin-set-value'),
    )

    expect(result.fieldId).toBe(fieldId)
    expect(result.value).toBe('admin-set-value')
  })

  it('throws NotFoundError for unknown fieldId', async () => {
    const { clientId, projectId } = await seedProject(container)
    const { userId } = await registerUser.execute(
      new RegisterUserCommand(
        projectId,
        'user@example.com',
        'userpassword123',
        {},
        null,
        null,
        null,
      ),
    )

    await expect(
      handler.execute(
        new UpdateProjectUserFieldCommand(
          clientId,
          userId,
          '00000000-0000-0000-0000-000000000000',
          'value',
        ),
      ),
    ).rejects.toThrow(NotFoundError)
  })
  it('throws NotFoundError when clientId does not own the user project', async () => {
    const { userId } = await seedUser(container)

    await expect(
      handler.execute(
        new UpdateProjectUserFieldCommand(
          '00000000-0000-0000-0000-000000000000',
          userId,
          '00000000-0000-0000-0000-000000000001',
          'value',
        ),
      ),
    ).rejects.toThrow(NotFoundError)
  })
})
