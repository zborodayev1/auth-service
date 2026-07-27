import { inject, injectable } from 'inversify'
import { AddProjectFieldCommand } from './AddProjectFieldCommand'
import { ProjectFieldRepository } from '@aggregates/projectField/ProjectFieldRepository'
import { ConflictError } from '@shared/errors/ConflictError'
import { ProjectFieldFactory } from '@factories/ProjectFieldFactory'

interface AddProjectFieldResult {
  fieldId: string
}

@injectable()
export class AddProjectFieldHandler {
  constructor(
    @inject(ProjectFieldRepository) private readonly projectFields: ProjectFieldRepository,

    @inject(ProjectFieldFactory)
    private readonly projectFieldFactory: ProjectFieldFactory,
  ) {}
  async execute(command: AddProjectFieldCommand): Promise<AddProjectFieldResult> {
    const exists = await this.projectFields.findByProjectAndName(command.projectId, command.name)

    if (exists) {
      throw new ConflictError('Project field already exists')
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

    return { fieldId: projectField.id }
  }
}
