import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { DeleteProjectHandler } from './DeleteProjectHandler'
import { DeleteProjectCommand } from './DeleteProjectCommand'
import { GetClientProjectsHandler } from '../../../queries/client/GetClientProjects/GetClientProjectsHandler'
import { GetClientProjectsQuery } from '../../../queries/client/GetClientProjects/GetClientProjectsQuery'
import { LoginUserHandler } from '../../user/LoginUser/LoginUserHandler'
import { LoginUserCommand } from '../../user/LoginUser/LoginUserCommand'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { getTestContainer, disconnectTestDb } from '../../../../tests/helpers/container'
import { truncateAll } from '../../../../tests/helpers/db'
import { seedUser, SEED } from '../../../../tests/helpers/userSeed'

const container = getTestContainer()
const handler = container.get(DeleteProjectHandler)
const getProjects = container.get(GetClientProjectsHandler)
const loginUser = container.get(LoginUserHandler)

describe('DeleteProjectHandler', () => {
  beforeEach(async () => { await truncateAll(container) })
  afterAll(async () => { await disconnectTestDb() })

  it('deletes project successfully', async () => {
    const { clientId, projectId } = await seedUser(container)

    const result = await handler.execute(new DeleteProjectCommand(clientId, projectId))

    expect(result.success).toBe(true)
  })

  it('project no longer appears in client list', async () => {
    const { clientId, projectId } = await seedUser(container)

    await handler.execute(new DeleteProjectCommand(clientId, projectId))

    const projects = await getProjects.execute(new GetClientProjectsQuery(clientId))
    expect(projects.find(p => p.id === projectId)).toBeUndefined()
  })

  it('users cannot login after project deletion', async () => {
    const { clientId, projectId } = await seedUser(container)

    await handler.execute(new DeleteProjectCommand(clientId, projectId))

    await expect(
      loginUser.execute(new LoginUserCommand(SEED.user.password, SEED.user.email, projectId, null, null, null)),
    ).rejects.toThrow(UnauthorizedError)
  })
})
