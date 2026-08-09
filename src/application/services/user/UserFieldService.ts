import { FieldType } from '@aggregates/projectField/FieldType'
import { ProjectFieldRepository } from '@aggregates/projectField/ProjectFieldRepository'
import { UserFieldValueRepository } from '@aggregates/userFieldValue/UserFieldValueRepository'
import { injectable, inject } from 'inversify'

interface FieldsType {
  id: string
  name: string
  type: FieldType
  value: string | null
  required: boolean
  defaultValue: string | null
}

@injectable()
export class UserFieldService {
  constructor(
    @inject(ProjectFieldRepository) private readonly projectFields: ProjectFieldRepository,
    @inject(UserFieldValueRepository) private readonly userFields: UserFieldValueRepository,
  ) {}

  async getFieldsWithValues(userId: string, projectId: string): Promise<FieldsType[]> {
    const fields = await this.projectFields.findByProjectId(projectId)
    const values = await this.userFields.findByUserId(userId)
    const valueByFieldId = new Map(values.map((v) => [v.fieldId, v.value]))

    return fields.map((f) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      value: valueByFieldId.get(f.id) ?? null,
      required: f.required,
      defaultValue: f.defaultValue,
    }))
  }
}
