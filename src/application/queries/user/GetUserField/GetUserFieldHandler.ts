import { inject, injectable } from 'inversify'
import { GetUserFieldQuery } from './GetUserFieldQuery'
import { ProjectFieldRepository } from '@aggregates/projectField/ProjectFieldRepository'
import { UserFieldValueRepository } from '@aggregates/userFieldValue/UserFieldValueRepository'
import { UserRepository } from '@aggregates/user/UserRepository'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { FieldType } from '@aggregates/projectField/FieldType'

interface GetUserFieldResult {
  field: {
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
    @inject(UserRepository)
    private readonly users: UserRepository,
    @inject(ProjectFieldRepository)
    private readonly projectFields: ProjectFieldRepository,

    @inject(UserFieldValueRepository)
    private readonly userFields: UserFieldValueRepository,
  ) {}

  async execute(query: GetUserFieldQuery): Promise<GetUserFieldResult> {
    const user = await this.users.findById(query.userId)
    if (!user) throw new NotFoundError('User not found', 'USER_NOT_FOUND', { query: query })

    if (user.projectId !== query.projectId) {
      throw new NotFoundError('User not found', 'ACCESS_DENIED', { query: query, user: user })
    }

    const field = await this.projectFields.findByProjectAndName(user.projectId, query.fieldName)

    if (!field)
      throw new NotFoundError('Field Not Found', 'FIELD_NOT_FOUND', { user: user, query: query })

    const userField = await this.userFields.findByUserAndField(query.userId, field.id)

    return {
      field: {
        name: field.name,
        type: field.type,
        value: userField?.value ?? null,
        required: field.required,
        defaultValue: field.defaultValue,
      },
    }
  }
}
