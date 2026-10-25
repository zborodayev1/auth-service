import { RegisterUserCommand } from '@app/commands/user/RegisterUser/RegisterUserCommand'
import type { RegisterUserResult } from '@app/commands/user/RegisterUser/RegisterUserHandler'
import { RegisterUserHandler } from '@app/commands/user/RegisterUser/RegisterUserHandler'
import type { Container } from 'inversify'

export async function seedUser(
  container: Container,
  projectId: string,
  overrides?: { email?: string; password?: string },
): Promise<RegisterUserResult> {
  return await container
    .get(RegisterUserHandler)
    .execute(
      new RegisterUserCommand(
        projectId,
        overrides?.email ?? 'user@example.com',
        overrides?.password ?? 'userpassword123',
        {},
        null,
        null,
        null,
      ),
    )
}
