import { UserRepository } from '@aggregates/user/UserRepository'
import { inject, injectable } from 'inversify'
import { GetUserProfileQuery } from './GetUserProfileQuery'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { FieldType } from '@aggregates/projectField/FieldType'
import { UserFieldService } from '@services/user/UserFieldService'

interface UserProfileField {
  name: string
  type: FieldType
  value: string | null
}

interface GetUserProfileResult {
  userId: string
  email: string
  projectId: string
  createdAt: Date
  fields: UserProfileField[]
}

@injectable()
export class GetUserProfileHandler {
  constructor(
    @inject(UserRepository)
    private readonly users: UserRepository,

    @inject(UserFieldService)
    private readonly fieldsService: UserFieldService,
  ) {}

  async execute(query: GetUserProfileQuery): Promise<GetUserProfileResult> {
    const user = await this.users.findById(query.userId)
    if (!user) throw new NotFoundError('User not found', 'USER_NOT_FOUND', { query: query })

    const profileFields = await this.fieldsService.getFieldsWithValues(query.userId, user.projectId)

    return {
      userId: user.id,
      email: user.email.toString(),
      projectId: user.projectId,
      createdAt: user.createdAt,
      fields: profileFields,
    }
  }
}
