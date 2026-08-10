import { ProjectFieldRepository } from '@aggregates/projectField/ProjectFieldRepository'
import { inject, injectable } from 'inversify'
import { UpdateUserFieldCommand } from './UpdateUserFieldCommand'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { SchemaBuilderService } from '@services/schema/SchemaBuilderService'
import { UserFieldValueFactory } from '@factories/UserFieldValueFactory'
import { UserFieldValueRepository } from '@aggregates/userFieldValue/UserFieldValueRepository'

interface UpdateUserFieldResult {
  fieldId: string
  value: string
}

@injectable()
export class UpdateUserFieldHandler {
  constructor(
    @inject(ProjectFieldRepository)
    private readonly projectFields: ProjectFieldRepository,

    @inject(SchemaBuilderService)
    private readonly schemaBuilder: SchemaBuilderService,

    @inject(UserFieldValueFactory)
    private readonly fieldFactory: UserFieldValueFactory,

    @inject(UserFieldValueRepository)
    private readonly userFields: UserFieldValueRepository,
  ) {}

  async execute(command: UpdateUserFieldCommand): Promise<UpdateUserFieldResult> {
    const field = await this.projectFields.findByIdAndProject(command.fieldId, command.projectId)

    if (!field) {
      throw new NotFoundError('Field not found', 'FIELD_NOT_FOUND', {
        command: command,
      })
    }

    const validated = this.schemaBuilder.build([field]).parse({ [command.fieldId]: command.value })

    const serialized = String(validated[command.fieldId])

    const existing = await this.userFields.findByUserAndField(command.userId, field.id)

    let params = existing
      ? { id: existing.id, userId: command.userId, fieldId: field.id, value: serialized }
      : { userId: command.userId, fieldId: field.id, value: serialized }

    const fieldValue = this.fieldFactory.create(params)

    await this.userFields.save(fieldValue)

    return { fieldId: field.id, value: serialized }
  }
}
