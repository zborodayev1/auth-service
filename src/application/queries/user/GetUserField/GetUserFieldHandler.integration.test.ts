import { beforeEach, describe, expect, it } from 'vitest'
import { GetUserFieldHandler } from './GetUserFieldHandler'
import { GetUserFieldQuery } from './GetUserFieldQuery'
import { UpdateUserFieldHandler } from '../../../commands/user/UpdateUserField/UpdateUserFieldHandler'
import { UpdateUserFieldCommand } from '../../../commands/user/UpdateUserField/UpdateUserFieldCommand'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { getTestContainer } from '../../../../tests/helpers/container'
import { truncateAll } from '../../../../tests/helpers/db'
import { seedUser, seedUserWithField, SEED } from '../../../../tests/helpers/userSeed'
import { CreateProjectHandler } from '../../../commands/project/CreateProject/CreateProjectHandler'
import { CreateProjectCommand } from '../../../commands/project/CreateProject/CreateProjectCommand'
import { AddProjectFieldHandler } from '../../../commands/project/AddProjectField/AddProjectFieldHandler'
import { AddProjectFieldCommand } from '../../../commands/project/AddProjectField/AddProjectFieldCommand'

const container = getTestContainer()
const handler = container.get(GetUserFieldHandler)
const updateHandler = container.get(UpdateUserFieldHandler)
const createProject = container.get(CreateProjectHandler)
const addField = container.get(AddProjectFieldHandler)

describe('GetUserFieldHandler', () => {
  beforeEach(async () => {
    await truncateAll(container)
  })

  it('returns field with null value when not yet set', async () => {
    const { userId, projectId, fieldId } = await seedUserWithField(container)

    const result = await handler.execute(new GetUserFieldQuery(userId, projectId, fieldId))

    expect(result.field.id).toBe(fieldId)
    expect(result.field.name).toBe(SEED.field.name)
    expect(result.field.value).toBeNull()
  })

  it('returns field with value after update', async () => {
    const { userId, projectId, fieldId } = await seedUserWithField(container)

    await updateHandler.execute(new UpdateUserFieldCommand(userId, projectId, fieldId, 'developer'))

    const result = await handler.execute(new GetUserFieldQuery(userId, projectId, fieldId))

    expect(result.field.value).toBe('developer')
  })

  it('throws NotFoundError for unknown fieldId', async () => {
    const { userId, projectId } = await seedUserWithField(container)

    await expect(
      handler.execute(
        new GetUserFieldQuery(userId, projectId, '00000000-0000-0000-0000-000000000000'),
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
      handler.execute(new GetUserFieldQuery(userId, otherProjectId, otherFieldId)),
    ).rejects.toThrow(NotFoundError)
  })
})
