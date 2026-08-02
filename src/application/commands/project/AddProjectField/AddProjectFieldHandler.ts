import { inject, injectable } from 'inversify'
import { AddProjectFieldCommand } from './AddProjectFieldCommand'
import { ProjectFieldRepository } from '@aggregates/projectField/ProjectFieldRepository'
import { ConflictError } from '@shared/errors/ConflictError'
import { ProjectFieldFactory } from '@factories/ProjectFieldFactory'
import { SchemaBuilderService } from '@services/schema/SchemaBuilderService'

interface AddProjectFieldResult {
  fieldId: string
}

@injectable()
export class AddProjectFieldHandler {
  constructor(
    @inject(ProjectFieldRepository) private readonly projectFields: ProjectFieldRepository,

    @inject(ProjectFieldFactory)
    private readonly projectFieldFactory: ProjectFieldFactory,

    @inject(SchemaBuilderService) private readonly schemaBuilder: SchemaBuilderService,
  ) {}
  async execute(command: AddProjectFieldCommand): Promise<AddProjectFieldResult> {
    const exists = await this.projectFields.findByProjectAndName(command.projectId, command.name)

    if (exists) {
      throw new ConflictError('Project field already exists', 'FIELD_ALREADY_EXISTS', {
        command: command,
        field: exists,
      })
    }

    const projectField = this.projectFieldFactory.create({
      projectId: command.projectId,
      name: command.name,
      type: command.type,
      required: command.required,
      defaultValue: command.defaultValue,
      enumValues: command.enumValues,
    })

    await this.projectFields.save(projectField)

    this.schemaBuilder.invalidate(command.projectId)

    return { fieldId: projectField.id }
  }
}
