import { inject, injectable } from 'inversify'
import { GetUserFieldQuery } from './GetUserFieldQuery'
import { ProjectFieldRepository } from '@aggregates/projectField/ProjectFieldRepository'
import { UserRepository } from '@aggregates/user/UserRepository'
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

    @inject(UserRepository)
    private readonly users: UserRepository,

    @inject(UserFieldValueRepository)
    private readonly userFields: UserFieldValueRepository,
  ) {}

  async execute(query: GetUserFieldQuery): Promise<GetUserFieldResult> {
    const field = await this.projectFields.findByIdAndProject(query.fieldId, query.projectId)

    if (!field) throw new NotFoundError('Field not found', 'FIELD_NOT_FOUND', { query: query })

    const user = await this.users.findById(query.userId)
    if (!user || user.projectId !== query.projectId)
      throw new NotFoundError('User not found', 'USER_NOT_FOUND', {
        userId: query.userId,
        projectId: query.projectId,
      })

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
