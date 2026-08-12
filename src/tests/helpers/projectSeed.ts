import type { Container } from 'inversify'
import { RegisterClientHandler } from '../../application/commands/client/RegisterClient/RegisterClientHandler'
import { RegisterClientCommand } from '../../application/commands/client/RegisterClient/RegisterClientCommand'
import { CreateProjectHandler } from '../../application/commands/project/CreateProject/CreateProjectHandler'
import { CreateProjectCommand } from '../../application/commands/project/CreateProject/CreateProjectCommand'
import { AddProjectFieldHandler } from '../../application/commands/project/AddProjectField/AddProjectFieldHandler'
import { AddProjectFieldCommand } from '../../application/commands/project/AddProjectField/AddProjectFieldCommand'

export const PROJECT_SEED = {
  client: { name: 'Test Client', email: 'client@example.com', password: 'password123' },
  project: { name: 'Test Project' },
  field: { name: 'biography', type: 'string' as const },
}

export interface ProjectSeedResult {
  clientId: string
  projectId: string
}

export interface ProjectSeedWithFieldResult extends ProjectSeedResult {
  fieldId: string
}

export async function seedProject(container: Container): Promise<ProjectSeedResult> {
  const { clientId } = await container
    .get(RegisterClientHandler)
    .execute(
      new RegisterClientCommand(
        PROJECT_SEED.client.name,
        PROJECT_SEED.client.email,
        PROJECT_SEED.client.password,
        null,
        null,
        null,
      ),
    )

  const { projectId } = await container
    .get(CreateProjectHandler)
    .execute(new CreateProjectCommand(PROJECT_SEED.project.name, clientId))

  return { clientId, projectId }
}

export async function seedProjectWithField(
  container: Container,
): Promise<ProjectSeedWithFieldResult> {
  const { clientId, projectId } = await seedProject(container)

  const { fieldId } = await container
    .get(AddProjectFieldHandler)
    .execute(
      new AddProjectFieldCommand(
        projectId,
        clientId,
        PROJECT_SEED.field.name,
        PROJECT_SEED.field.type,
        false,
        null,
        [],
      ),
    )

  return { clientId, projectId, fieldId }
}
