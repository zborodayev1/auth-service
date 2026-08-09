import { ProjectFieldRepository } from '@aggregates/projectField/ProjectFieldRepository'
import { inject, injectable } from 'inversify'
import { UpdateProjectFieldCommand } from './UpdateProjectFieldCommand'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { SchemaBuilderService } from '@services/schema/SchemaBuilderService'
import { ProjectAccessService } from '@services/project/ProjectAccessService'

interface UpdateProjectFieldResult {
  fieldId: string
}

@injectable()
export class UpdateProjectFieldHandler {
  constructor(
    @inject(ProjectFieldRepository) private readonly projectFields: ProjectFieldRepository,

    @inject(SchemaBuilderService) private readonly schemaBuilder: SchemaBuilderService,

    @inject(ProjectAccessService) private readonly accessService: ProjectAccessService,
  ) {}

  async execute(command: UpdateProjectFieldCommand): Promise<UpdateProjectFieldResult> {
    await this.accessService.verifyByProjectId(command.clientId, command.projectId)

    const field = await this.projectFields.findByIdAndProject(command.fieldId, command.projectId)

    if (!field)
      throw new NotFoundError('Field not found', 'FIELD_NOT_FOUND', {
        command: command,
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
