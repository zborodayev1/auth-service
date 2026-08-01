import { inject, injectable } from 'inversify'
import { GetProjectUserFieldsQuery } from './GetProjectUserFieldsQuery'
import { FieldType } from '@aggregates/projectField/FieldType'
import { ProjectAccessService } from '@services/project/ProjectAccessService'
import { UserFieldService } from '@services/user/UserFieldService'

interface GetProjectUserFieldsResult {
  fields: { name: string; type: FieldType; value: string | null }[]
}

@injectable()
export class GetProjectUserFieldsHandler {
  constructor(
    @inject(ProjectAccessService)
    private readonly accessService: ProjectAccessService,

    @inject(UserFieldService)
    private readonly fieldsService: UserFieldService,
  ) {}

  async execute(query: GetProjectUserFieldsQuery): Promise<GetProjectUserFieldsResult> {
    const { user } = await this.accessService.verifyByUserId(query.clientId, query.userId)

    const profileFields = await this.fieldsService.getFieldsWithValues(query.userId, user.projectId)

    return {
      fields: profileFields,
    }
  }
}
