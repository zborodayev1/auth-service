import { ProjectFieldRepository } from '@aggregates/projectField/ProjectFieldRepository'
import { UserFieldValueRepository } from '@aggregates/userFieldValue/UserFieldValueRepository'
import { inject, injectable } from 'inversify'
import { DeleteProjectFieldCommand } from './DeleteProjectFieldCommand'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { ConflictError } from '@shared/errors/ConflictError'
import { UnitOfWork } from '@ports/UnitOfWork'

interface DeleteProjectFieldResult {
  success: boolean
}

@injectable()
export class DeleteProjectFieldHandler {
  constructor(
    @inject(UnitOfWork) private readonly unitOfWork: UnitOfWork,

    @inject(UserFieldValueRepository)
    private readonly fieldValues: UserFieldValueRepository,

    @inject(ProjectFieldRepository) private readonly projectFields: ProjectFieldRepository,
  ) {}

  async execute(command: DeleteProjectFieldCommand): Promise<DeleteProjectFieldResult> {
    const field = await this.projectFields.findById(command.fieldId)
    if (!field) {
      throw new NotFoundError('Field not found', 'FIELD_NOT_FOUND', {
        command: command,
      })
    }

    if (field.projectId !== command.projectId) {
      throw new NotFoundError('Field not found', 'ACCESS_DENIED', {
        command: command,
        field: field,
      })
    }

    const values = await this.fieldValues.existsByFieldId(field.id)

    if (values) {
      if (!command.force)
        throw new ConflictError('Cannot delete field with existing data', 'ACTION_IS_NOT_FORCE', {
          command: command,
        })
      await this.unitOfWork.execute(async () => {
        await this.fieldValues.deleteByFieldId(field.id)
        await this.projectFields.delete(field.id)
      })
    } else {
      await this.projectFields.delete(field.id)
    }

    return { success: true }
  }
}
