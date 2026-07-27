import { ProjectFieldRepository } from '@aggregates/projectField/ProjectFieldRepository'
import { UserFieldValueRepository } from '@aggregates/userFieldValue/UserFieldValueRepository'
import { inject, injectable } from 'inversify'
import { DeleteProjectFieldCommand } from './DeleteProjectFieldCommand'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { ConflictError } from '@shared/errors/ConflictError'

interface DeleteProjectFieldResult {
  message: string
}

@injectable()
export class DeleteProjectFieldHandler {
  constructor(
    @inject(UserFieldValueRepository)
    private readonly fieldValues: UserFieldValueRepository,

    @inject(ProjectFieldRepository) private readonly projectFields: ProjectFieldRepository,
  ) {}

  async execute(command: DeleteProjectFieldCommand): Promise<DeleteProjectFieldResult> {
    const field = await this.projectFields.findById(command.fieldId)
    if (!field) {
      throw new NotFoundError('Field not found')
    }

    if (field.projectId !== command.projectId) {
      throw new NotFoundError('Field not found')
    }

    const values = await this.fieldValues.existsByFieldId(field.id)

    if (values) {
      if (!command.force) throw new ConflictError('Cannot delete field with existing data')
      await this.fieldValues.deleteByFieldId(field.id)
    }
    await this.projectFields.delete(field.id)

    return { message: 'Success deleted project field' }
  }
}
