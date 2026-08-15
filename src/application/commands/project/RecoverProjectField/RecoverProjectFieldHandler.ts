import { inject, injectable } from 'inversify'
import { RecoverProjectFieldCommand } from './RecoverProjectFieldCommand'
import { ProjectFieldRepository } from '@aggregates/projectField/ProjectFieldRepository'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { SchemaBuilderService } from '@services/schema/SchemaBuilderService'
import { UserFieldValueRepository } from '@aggregates/userFieldValue/UserFieldValueRepository'
import { UnitOfWork } from '@ports/UnitOfWork'
import { ProjectAccessService } from '@services/project/ProjectAccessService'

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

    @inject(ProjectAccessService)
    private readonly accessService: ProjectAccessService,
  ) {}

  async execute(command: RecoverProjectFieldCommand): Promise<RecoverProjectFieldResult> {
    await this.accessService.verifyByProjectId(command.clientId, command.projectId)

    const field = await this.projectFields.findDeletedByIdAndProject(
      command.fieldId,
      command.projectId,
    )

    if (!field)
      throw new NotFoundError('Field not found', 'FIELD_NOT_FOUND', {
        command: command,
      })

    const recovered = field.recover()

    await this.unitOfWork.execute(async () => {
      await this.projectFields.save(recovered)

      await this.userFieldValues.recoverByFieldId(field.id)
    })

    await this.schemaBuilder.invalidate(command.projectId)

    return { fieldId: recovered.id }
  }
}
