import { inject, injectable } from 'inversify'
import { GetProjectUserQuery } from './GetProjectUserQuery'
import { FieldType } from '@aggregates/projectField/FieldType'
import { ProjectAccessService } from '@services/project/ProjectAccessService'
import { UserFieldService } from '@services/user/UserFieldService'

interface UserProfileField {
  name: string
  type: FieldType
  value: string | null
}

interface GetProjectUserResult {
  id: string
  email: string
  projectId: string
  createdAt: Date
  fields: UserProfileField[]
}

@injectable()
export class GetProjectUserHandler {
  constructor(
    @inject(UserFieldService)
    private readonly fieldsService: UserFieldService,

    @inject(ProjectAccessService)
    private readonly accessService: ProjectAccessService,
  ) {}

  async execute(query: GetProjectUserQuery): Promise<GetProjectUserResult> {
    const { user } = await this.accessService.verifyByUserId(query.clientId, query.userId)

    const profileFields = await this.fieldsService.getFieldsWithValues(query.userId, user.projectId)

    return {
      id: user.id,
      email: user.email.toString(),
      projectId: user.projectId,
      createdAt: user.createdAt,
      fields: profileFields,
    }
  }
}
