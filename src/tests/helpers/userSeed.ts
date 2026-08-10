import type { Container } from 'inversify'
import { RegisterClientHandler } from '../../application/commands/client/RegisterClient/RegisterClientHandler'
import { RegisterClientCommand } from '../../application/commands/client/RegisterClient/RegisterClientCommand'
import { CreateProjectHandler } from '../../application/commands/project/CreateProject/CreateProjectHandler'
import { CreateProjectCommand } from '../../application/commands/project/CreateProject/CreateProjectCommand'
import { RegisterUserHandler } from '../../application/commands/user/RegisterUser/RegisterUserHandler'
import { RegisterUserCommand } from '../../application/commands/user/RegisterUser/RegisterUserCommand'
import { AddProjectFieldHandler } from '../../application/commands/project/AddProjectField/AddProjectFieldHandler'
import { AddProjectFieldCommand } from '../../application/commands/project/AddProjectField/AddProjectFieldCommand'

export const SEED = {
  client: { name: 'Test Client', email: 'client@example.com', password: 'password123' },
  project: { name: 'Test Project' },
  user: { email: 'user@example.com', password: 'userpassword123' },
}

export interface UserSeedResult {
  clientId: string
  projectId: string
  userId: string
  accessToken: string
  refreshToken: string
}

export async function seedUser(container: Container): Promise<UserSeedResult> {
  const { clientId } = await container.get(RegisterClientHandler).execute(
    new RegisterClientCommand(
      SEED.client.name, SEED.client.email, SEED.client.password, null, null, null,
    ),
  )

  const { projectId } = await container.get(CreateProjectHandler).execute(
    new CreateProjectCommand(SEED.project.name, clientId),
  )

  const { userId, accessToken, refreshToken } = await container.get(RegisterUserHandler).execute(
    new RegisterUserCommand(projectId, SEED.user.email, SEED.user.password, {}, null, null, null),
  )

  return { clientId, projectId, userId, accessToken, refreshToken }
}

export interface UserSeedWithFieldResult extends UserSeedResult {
  fieldId: string
}

export async function seedUserWithField(container: Container): Promise<UserSeedWithFieldResult> {
  const seed = await seedUser(container)

  const { fieldId } = await container.get(AddProjectFieldHandler).execute(
    new AddProjectFieldCommand(
      seed.projectId,
      seed.clientId,
      'bio',
      'string',
      false,
      null,
      [],
    ),
  )

  return { ...seed, fieldId }
}
