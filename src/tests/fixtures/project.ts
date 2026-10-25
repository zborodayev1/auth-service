import { CreateProjectCommand } from '@app/commands/project/CreateProject/CreateProjectCommand'
import type { CreateProjectResult } from '@app/commands/project/CreateProject/CreateProjectHandler'
import { CreateProjectHandler } from '@app/commands/project/CreateProject/CreateProjectHandler'
import type { Container } from 'inversify'

export async function seedProject(
  container: Container,
  clientId: string,
  overrides?: { name?: string },
): Promise<CreateProjectResult> {
  return await container
    .get(CreateProjectHandler)
    .execute(new CreateProjectCommand(overrides?.name ?? 'Test Project', clientId))
}
