import { inject, injectable } from 'inversify'
import { GetUserFieldQuery } from './GetUserFieldQuery'
import { ProjectFieldRepository } from '@aggregates/projectField/ProjectFieldRepository'
import { UserFieldValueRepository } from '@aggregates/userFieldValue/UserFieldValueRepository'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { FieldType } from '@aggregates/projectField/FieldType'

interface GetUserFieldResult {
  field: {
    id: string
    name: string
    type: FieldType
    value: string | null
    required: boolean
    defaultValue: string | null
  }
}

@injectable()
export class GetUserFieldHandler {
  constructor(
    @inject(ProjectFieldRepository)
    private readonly projectFields: ProjectFieldRepository,

    @inject(UserFieldValueRepository)
    private readonly userFields: UserFieldValueRepository,
  ) {}

  async execute(query: GetUserFieldQuery): Promise<GetUserFieldResult> {
    const field = await this.projectFields.findByIdAndProject(query.fieldId, query.projectId)

    if (!field) throw new NotFoundError('Field Not Found', 'FIELD_NOT_FOUND', { query: query })

    const userField = await this.userFields.findByUserAndField(query.userId, field.id)

    return {
      field: {
        id: field.id,
        name: field.name,
        type: field.type,
        value: userField?.value ?? null,
        required: field.required,
        defaultValue: field.defaultValue,
      },
    }
  }
}
