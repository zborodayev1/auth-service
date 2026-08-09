import { inject, injectable } from 'inversify'
import { UpdateProjectUserFieldCommand } from './UpdateProjectUserFieldCommand'
import { ProjectFieldRepository } from '@aggregates/projectField/ProjectFieldRepository'
import { UserFieldValueRepository } from '@aggregates/userFieldValue/UserFieldValueRepository'
import { ProjectAccessService } from '@services/project/ProjectAccessService'
import { UserFieldValueFactory } from '@factories/UserFieldValueFactory'
import { SchemaBuilderService } from '@services/schema/SchemaBuilderService'
import { NotFoundError } from '@shared/errors/NotFoundError'

interface UpdateProjectUserFieldResult {
  fieldId: string
  value: string
}

@injectable()
export class UpdateProjectUserFieldHandler {
  constructor(
    @inject(ProjectFieldRepository)
    private readonly projectFields: ProjectFieldRepository,

    @inject(UserFieldValueRepository)
    private readonly userFields: UserFieldValueRepository,

    @inject(ProjectAccessService)
    private readonly accessService: ProjectAccessService,

    @inject(UserFieldValueFactory)
    private readonly fieldFactory: UserFieldValueFactory,

    @inject(SchemaBuilderService)
    private readonly schemaBuilder: SchemaBuilderService,
  ) {}

  async execute(command: UpdateProjectUserFieldCommand): Promise<UpdateProjectUserFieldResult> {
    const { user } = await this.accessService.verifyByUserId(command.clientId, command.userId)

    const field = await this.projectFields.findByIdAndProject(command.fieldId, user.projectId)

    if (!field) {
      throw new NotFoundError('Field not found', 'FIELD_NOT_FOUND', {
        command: command,
      })
    }

    const schema = this.schemaBuilder.build([field])
    const validated = schema.parse({ [command.fieldId]: command.value })

    const serialized = String(validated[command.fieldId])

    const fieldValue = this.fieldFactory.create({
      userId: command.userId,
      fieldId: field.id,
      value: serialized,
    })

    await this.userFields.save(fieldValue)

    this.schemaBuilder.invalidate(user.projectId)

    return { fieldId: field.id, value: serialized }
  }
}
