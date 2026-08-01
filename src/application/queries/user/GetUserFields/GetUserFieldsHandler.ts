import { inject, injectable } from 'inversify'
import { GetUserFieldsQuery } from './GetUserFieldsQuery'
import { FieldType } from '@aggregates/projectField/FieldType'
import { UserRepository } from '@aggregates/user/UserRepository'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { UserFieldService } from '@services/user/UserFieldService'

interface GetUserFieldsResult {
  fields: {
    name: string
    type: FieldType
    value: string | null
    required: boolean
    defaultValue: string | null
  }[]
}

@injectable()
export class GetUserFieldsHandler {
  constructor(
    @inject(UserRepository)
    private readonly users: UserRepository,

    @inject(UserFieldService)
    private readonly fieldsService: UserFieldService,
  ) {}

  async execute(query: GetUserFieldsQuery): Promise<GetUserFieldsResult> {
    const user = await this.users.findById(query.userId)
    if (!user) throw new NotFoundError('User not found', 'USER_NOT_FOUND', { query: query })

    if (user.projectId !== query.projectId) {
      throw new NotFoundError('User not found', 'ACCESS_DENIED', { query: query, user: user })
    }

    const profileFields = await this.fieldsService.getFieldsWithValues(query.userId, user.projectId)

    return {
      fields: profileFields,
    }
  }
}
