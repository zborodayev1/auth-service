import { describe, expect, it } from 'vitest'
import { ChangeUserEmailHandler } from './ChangeUserEmailHandler'
import { ChangeUserEmailCommand } from './ChangeUserEmailCommand'
import { ConflictError } from '@shared/errors/ConflictError'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { getTestContainer } from '@tests/helpers/container'
import { useTransactionIsolation } from '@tests/helpers/db'
import { seedUser, SEED } from '@tests/helpers/userSeed'
import { RegisterUserHandler } from '../RegisterUser/RegisterUserHandler'
import { RegisterUserCommand } from '../RegisterUser/RegisterUserCommand'
import { CreateProjectHandler } from '../../project/CreateProject/CreateProjectHandler'
import { CreateProjectCommand } from '../../project/CreateProject/CreateProjectCommand'

const container = getTestContainer()
const handler = container.get(ChangeUserEmailHandler)
const createProject = container.get(CreateProjectHandler)

describe('ChangeUserEmailHandler', () => {
  useTransactionIsolation(container)

  it('changes email with valid password', async () => {
    const { userId, projectId } = await seedUser(container)

    const result = await handler.execute(
      new ChangeUserEmailCommand(userId, projectId, 'new@example.com', SEED.user.password),
    )

    expect(result.email).toBe('new@example.com')
  })

  it('throws UnauthorizedError for wrong password', async () => {
    const { userId, projectId } = await seedUser(container)

    await expect(
      handler.execute(
        new ChangeUserEmailCommand(userId, projectId, 'new@example.com', 'wrongpassword'),
      ),
    ).rejects.toThrow(UnauthorizedError)
  })

  it('throws NotFoundError when projectId does not match user project', async () => {
    const { userId, clientId } = await seedUser(container)
    const { projectId: otherProjectId } = await createProject.execute(
      new CreateProjectCommand('Other Project', clientId),
    )

    await expect(
      handler.execute(
        new ChangeUserEmailCommand(userId, otherProjectId, 'new@example.com', SEED.user.password),
      ),
    ).rejects.toThrow(NotFoundError)
  })

  it('throws ConflictError when new email already taken in same project', async () => {
    const { userId, projectId } = await seedUser(container)

    const registerUser = container.get(RegisterUserHandler)
    await registerUser.execute(
      new RegisterUserCommand(projectId, 'other@example.com', 'password123', {}, null, null, null),
    )

    await expect(
      handler.execute(
        new ChangeUserEmailCommand(userId, projectId, 'other@example.com', SEED.user.password),
      ),
    ).rejects.toThrow(ConflictError)
  })
})
