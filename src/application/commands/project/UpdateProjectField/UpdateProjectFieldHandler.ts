import { ProjectFieldRepository } from '@aggregates/projectField/ProjectFieldRepository'
import { inject, injectable } from 'inversify'
import { UpdateProjectFieldCommand } from './UpdateProjectFieldCommand'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'

interface UpdateProjectFieldResult {
  fieldId: string
}

@injectable()
export class UpdateProjectFieldHandler {
  constructor(
    @inject(ProjectFieldRepository) private readonly projectFields: ProjectFieldRepository,
  ) {}

  async execute(command: UpdateProjectFieldCommand): Promise<UpdateProjectFieldResult> {
    const field = await this.projectFields.findById(command.fieldId)

    if (!field) throw new NotFoundError('Field not found')
    if (field.projectId !== command.projectId) throw new UnauthorizedError('Field not found')

    const updated = field.update({
      name: command.name,
      required: command.required,
      defaultValue: command.defaultValue,
      enumValues: command.enumValues,
    })

    await this.projectFields.save(updated)
    return { fieldId: updated.id }
  }
}
