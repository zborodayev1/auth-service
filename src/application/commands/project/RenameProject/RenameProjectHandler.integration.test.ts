import { beforeEach, describe, expect, it } from 'vitest'
import { RenameProjectHandler } from './RenameProjectHandler'
import { RenameProjectCommand } from './RenameProjectCommand'
import { GetProjectHandler } from '../../../queries/project/GetProject/GetProjectHandler'
import { GetProjectQuery } from '../../../queries/project/GetProject/GetProjectQuery'
import { ConflictError } from '@shared/errors/ConflictError'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { getTestContainer } from '@tests/helpers/container'
import { truncateAll } from '@tests/helpers/db'
import { seedProject, PROJECT_SEED } from '@tests/helpers/projectSeed'
import { CreateProjectHandler } from '../CreateProject/CreateProjectHandler'
import { CreateProjectCommand } from '../CreateProject/CreateProjectCommand'

const container = getTestContainer()
const handler = container.get(RenameProjectHandler)
const getProject = container.get(GetProjectHandler)
const createProject = container.get(CreateProjectHandler)

describe('RenameProjectHandler', () => {
  beforeEach(async () => {
    await truncateAll(container)
  })

  it('renames project successfully', async () => {
    const { clientId, projectId } = await seedProject(container)

    const result = await handler.execute(
      new RenameProjectCommand(clientId, projectId, 'Renamed Project'),
    )

    expect(result.name).toBe('Renamed Project')
  })

  it('persists new name', async () => {
    const { clientId, projectId } = await seedProject(container)

    await handler.execute(new RenameProjectCommand(clientId, projectId, 'Renamed Project'))

    const project = await getProject.execute(new GetProjectQuery(projectId, clientId))
    expect(project.name).toBe('Renamed Project')
  })

  it('throws ConflictError when name already taken by another project', async () => {
    const { clientId, projectId } = await seedProject(container)
    await createProject.execute(new CreateProjectCommand('Another Project', clientId))

    await expect(
      handler.execute(new RenameProjectCommand(clientId, projectId, 'Another Project')),
    ).rejects.toThrow(ConflictError)
  })

  it('throws NotFoundError when clientId does not own the project', async () => {
    const { projectId } = await seedProject(container)

    await expect(
      handler.execute(
        new RenameProjectCommand('00000000-0000-0000-0000-000000000000', projectId, 'Hacked Name'),
      ),
    ).rejects.toThrow(NotFoundError)
  })

  it('allows renaming to same name (no-op)', async () => {
    const { clientId, projectId } = await seedProject(container)

    await expect(
      handler.execute(new RenameProjectCommand(clientId, projectId, PROJECT_SEED.project.name)),
    ).resolves.toBeTruthy()
  })
})
