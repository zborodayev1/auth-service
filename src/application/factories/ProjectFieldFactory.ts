import { FieldType } from '@aggregates/projectField/FieldType'
import { ProjectField } from '@aggregates/projectField/ProjectField'
import { IdGenerator } from '@ports/IdGenerator'
import { inject, injectable } from 'inversify'

interface CreateProjectFieldParams {
  projectId: string
  name: string
  type: FieldType
  required: boolean
  defaultValue: string | null
  enumValues: string[]
}

@injectable()
export class ProjectFieldFactory {
  constructor(@inject(IdGenerator) private readonly idGenerator: IdGenerator) {}

  create(params: CreateProjectFieldParams): ProjectField {
    return ProjectField.create({
      id: this.idGenerator.generate(),
      projectId: params.projectId,
      name: params.name,
      type: params.type,
      required: params.required,
      defaultValue: params.defaultValue,
      enumValues: params.enumValues,
    })
  }
}
