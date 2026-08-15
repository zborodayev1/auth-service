import { describe, expect, it } from 'vitest'
import { UpdateUserFieldHandler } from './UpdateUserFieldHandler'
import { UpdateUserFieldCommand } from './UpdateUserFieldCommand'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { getTestContainer } from '@tests/helpers/container'
import { useTransactionIsolation } from '@tests/helpers/db'
import { seedUser, seedUserWithField } from '@tests/helpers/userSeed'
import { CreateProjectHandler } from '../../project/CreateProject/CreateProjectHandler'
import { CreateProjectCommand } from '../../project/CreateProject/CreateProjectCommand'
import { AddProjectFieldHandler } from '../../project/AddProjectField/AddProjectFieldHandler'
import { AddProjectFieldCommand } from '../../project/AddProjectField/AddProjectFieldCommand'

const container = getTestContainer()
const handler = container.get(UpdateUserFieldHandler)
const createProject = container.get(CreateProjectHandler)
const addField = container.get(AddProjectFieldHandler)

describe('UpdateUserFieldHandler', () => {
  useTransactionIsolation(container)

  it('saves field value and returns fieldId and value', async () => {
    const { userId, projectId, fieldId } = await seedUserWithField(container)

    const result = await handler.execute(
      new UpdateUserFieldCommand(userId, projectId, fieldId, 'hello world'),
    )

    expect(result.fieldId).toBe(fieldId)
    expect(result.value).toBe('hello world')
  })

  it('overwrites previous value', async () => {
    const { userId, projectId, fieldId } = await seedUserWithField(container)

    await handler.execute(new UpdateUserFieldCommand(userId, projectId, fieldId, 'first'))
    const result = await handler.execute(
      new UpdateUserFieldCommand(userId, projectId, fieldId, 'second'),
    )

    expect(result.value).toBe('second')
  })

  it('throws NotFoundError for unknown fieldId', async () => {
    const { userId, projectId } = await seedUserWithField(container)

    await expect(
      handler.execute(
        new UpdateUserFieldCommand(
          userId,
          projectId,
          '00000000-0000-0000-0000-000000000000',
          'value',
        ),
      ),
    ).rejects.toThrow(NotFoundError)
  })

  it('throws NotFoundError when userId does not belong to the project', async () => {
    const { userId, clientId } = await seedUser(container)
    const { projectId: otherProjectId } = await createProject.execute(
      new CreateProjectCommand('Other Project', clientId),
    )
    const { fieldId: otherFieldId } = await addField.execute(
      new AddProjectFieldCommand(otherProjectId, clientId, 'bio', 'string', false, null, []),
    )

    await expect(
      handler.execute(new UpdateUserFieldCommand(userId, otherProjectId, otherFieldId, 'value')),
    ).rejects.toThrow(NotFoundError)
  })
})
