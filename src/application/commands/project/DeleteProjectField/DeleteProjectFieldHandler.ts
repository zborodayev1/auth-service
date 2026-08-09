import { ProjectFieldRepository } from '@aggregates/projectField/ProjectFieldRepository'
import { UserFieldValueRepository } from '@aggregates/userFieldValue/UserFieldValueRepository'
import { inject, injectable } from 'inversify'
import { DeleteProjectFieldCommand } from './DeleteProjectFieldCommand'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { ConflictError } from '@shared/errors/ConflictError'
import { UnitOfWork } from '@ports/UnitOfWork'
import { SchemaBuilderService } from '@services/schema/SchemaBuilderService'
import { ProjectAccessService } from '@services/project/ProjectAccessService'

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

    @inject(SchemaBuilderService) private readonly schemaBuilder: SchemaBuilderService,

    @inject(ProjectAccessService) private readonly accessService: ProjectAccessService,
  ) {}

  async execute(command: DeleteProjectFieldCommand): Promise<DeleteProjectFieldResult> {
    await this.accessService.verifyByProjectId(command.clientId, command.projectId)
    const field = await this.projectFields.findByIdAndProject(command.fieldId, command.projectId)
    if (!field) {
      throw new NotFoundError('Field not found', 'FIELD_NOT_FOUND', {
        command: command,
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

    this.schemaBuilder.invalidate(command.projectId)

    return { success: true }
  }
}
