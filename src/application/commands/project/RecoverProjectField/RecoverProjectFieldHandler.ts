import { inject, injectable } from 'inversify'
import { RecoverProjectFieldCommand } from './RecoverProjectFieldCommand'
import { ProjectFieldRepository } from '@aggregates/projectField/ProjectFieldRepository'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { SchemaBuilderService } from '@services/schema/SchemaBuilderService'
import { UserFieldValueRepository } from '@aggregates/userFieldValue/UserFieldValueRepository'
import { UnitOfWork } from '@ports/UnitOfWork'

interface RecoverProjectFieldResult {
  fieldId: string
}

@injectable()
export class RecoverProjectFieldHandler {
  constructor(
    @inject(UserFieldValueRepository) private readonly userFieldValues: UserFieldValueRepository,

    @inject(ProjectFieldRepository) private readonly projectFields: ProjectFieldRepository,

    @inject(SchemaBuilderService) private readonly schemaBuilder: SchemaBuilderService,

    @inject(UnitOfWork) private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(command: RecoverProjectFieldCommand): Promise<RecoverProjectFieldResult> {
    const field = await this.projectFields.findDeletedById(command.fieldId)

    if (!field)
      throw new NotFoundError('Field not found', 'FIELD_NOT_FOUND', {
        command: command,
      })
    if (field.projectId !== command.projectId)
      throw new NotFoundError('Field not found', 'ACCESS_DENIED', {
        command: command,
        field: field,
      })

    const recovered = field.recover()

    await this.unitOfWork.execute(async () => {
      await this.projectFields.save(recovered)

      await this.userFieldValues.recoverByFieldId(field.id)
    })

    this.schemaBuilder.invalidate(command.projectId)

    return { fieldId: recovered.id }
  }
}
