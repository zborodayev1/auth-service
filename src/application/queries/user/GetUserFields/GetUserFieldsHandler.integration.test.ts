import { beforeEach, describe, expect, it } from 'vitest'
import { GetUserFieldsHandler } from './GetUserFieldsHandler'
import { GetUserFieldsQuery } from './GetUserFieldsQuery'
import { UpdateUserFieldHandler } from '../../../commands/user/UpdateUserField/UpdateUserFieldHandler'
import { UpdateUserFieldCommand } from '../../../commands/user/UpdateUserField/UpdateUserFieldCommand'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { getTestContainer } from '../../../../tests/helpers/container'
import { truncateAll } from '../../../../tests/helpers/db'
import { seedUser, seedUserWithField, SEED } from '../../../../tests/helpers/userSeed'
import { CreateProjectHandler } from '../../../commands/project/CreateProject/CreateProjectHandler'
import { CreateProjectCommand } from '../../../commands/project/CreateProject/CreateProjectCommand'

const container = getTestContainer()
const handler = container.get(GetUserFieldsHandler)
const updateHandler = container.get(UpdateUserFieldHandler)
const createProject = container.get(CreateProjectHandler)

describe('GetUserFieldsHandler', () => {
  beforeEach(async () => {
    await truncateAll(container)
  })


  it('returns empty fields when project has no field definitions', async () => {
    const { userId, projectId } = await seedUser(container)

    const result = await handler.execute(new GetUserFieldsQuery(userId, projectId))

    expect(result.fields).toEqual([])
  })

  it('returns field with null value when not yet set', async () => {
    const { userId, projectId, fieldId } = await seedUserWithField(container)

    const result = await handler.execute(new GetUserFieldsQuery(userId, projectId))

    expect(result.fields).toHaveLength(1)
    expect(result.fields[0]?.id).toBe(fieldId)
    expect(result.fields[0]?.name).toBe(SEED.field.name)
    expect(result.fields[0]?.value).toBeNull()
  })

  it('returns field with value after update', async () => {
    const { userId, projectId, fieldId } = await seedUserWithField(container)

    await updateHandler.execute(new UpdateUserFieldCommand(userId, projectId, fieldId, 'developer'))

    const result = await handler.execute(new GetUserFieldsQuery(userId, projectId))

    expect(result.fields[0]?.value).toBe('developer')
  })

  it('throws NotFoundError when userId does not belong to the project', async () => {
    const { userId, clientId } = await seedUser(container)
    const { projectId: otherProjectId } = await createProject.execute(
      new CreateProjectCommand('Other Project', clientId),
    )

    await expect(
      handler.execute(new GetUserFieldsQuery(userId, otherProjectId)),
    ).rejects.toThrow(NotFoundError)
  })
})
