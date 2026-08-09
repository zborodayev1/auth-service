import { inject, injectable } from 'inversify'
import { GetUserFieldsQuery } from './GetUserFieldsQuery'
import { FieldType } from '@aggregates/projectField/FieldType'
import { UserRepository } from '@aggregates/user/UserRepository'
import { UserFieldService } from '@services/user/UserFieldService'

interface GetUserFieldsResult {
  fields: {
    id: string
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
    const profileFields = await this.fieldsService.getFieldsWithValues(
      query.userId,
      query.projectId,
    )

    return {
      fields: profileFields,
    }
  }
}
