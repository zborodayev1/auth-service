import { ProjectFieldRepository } from '@aggregates/projectField/ProjectFieldRepository'
import { inject, injectable } from 'inversify'
import { UpdateProjectFieldCommand } from './UpdateProjectFieldCommand'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { SchemaBuilderService } from '@services/schema/SchemaBuilderService'

interface UpdateProjectFieldResult {
  fieldId: string
}

@injectable()
export class UpdateProjectFieldHandler {
  constructor(
    @inject(ProjectFieldRepository) private readonly projectFields: ProjectFieldRepository,

    @inject(SchemaBuilderService) private readonly schemaBuilder: SchemaBuilderService,
  ) {}

  async execute(command: UpdateProjectFieldCommand): Promise<UpdateProjectFieldResult> {
    const field = await this.projectFields.findById(command.fieldId)

    if (!field)
      throw new NotFoundError('Field not found', 'FIELD_NOT_FOUND', {
        command: command,
      })
    if (field.projectId !== command.projectId)
      throw new NotFoundError('Field not found', 'ACCESS_DENIED', {
        command: command,
        field: field,
      })

    const updated = field.update({
      name: command.name,
      required: command.required,
      defaultValue: command.defaultValue,
      enumValues: command.enumValues,
    })

    await this.projectFields.save(updated)

    this.schemaBuilder.invalidate(command.projectId)
    return { fieldId: updated.id }
  }
}
