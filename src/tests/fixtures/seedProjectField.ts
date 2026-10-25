import { AddProjectFieldCommand } from '@app/commands/project/AddProjectField/AddProjectFieldCommand'
import type { AddProjectFieldResult } from '@app/commands/project/AddProjectField/AddProjectFieldHandler'
import { AddProjectFieldHandler } from '@app/commands/project/AddProjectField/AddProjectFieldHandler'
import type { Container } from 'inversify'

import type { FieldType } from '@aggregates/projectField/FieldType'

export async function seedProjectField(
  container: Container,
  projectId: string,
  clientId: string,
  overrides?: { name?: string; type: FieldType; required: boolean },
): Promise<AddProjectFieldResult> {
  return await container
    .get(AddProjectFieldHandler)
    .execute(
      new AddProjectFieldCommand(
        projectId,
        clientId,
        overrides?.name ?? 'bio',
        overrides?.type ?? 'string',
        overrides?.required ?? false,
        null,
        [],
      ),
    )
}
