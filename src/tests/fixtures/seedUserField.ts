import { SetUserFieldCommand } from '@app/commands/user/SetUserField/SetUserFieldCommand'
import type { SetUserFieldResult } from '@app/commands/user/SetUserField/SetUserFieldHandler'
import { SetUserFieldHandler } from '@app/commands/user/SetUserField/SetUserFieldHandler'
import type { Container } from 'inversify'

export async function seedUserField(
  container: Container,
  userId: string,
  projectId: string,
  fieldId: string,
  value: string,
): Promise<SetUserFieldResult> {
  return await container
    .get(SetUserFieldHandler)
    .execute(new SetUserFieldCommand(userId, projectId, fieldId, value))
}
