import type { FieldType } from '@aggregates/projectField/FieldType'
import { ISchemaCache } from '@ports/ISchemaCache'
import { inject, injectable } from 'inversify'
import z from 'zod'

export interface ProjectFieldDefinition {
  id: string
  name: string
  type: FieldType
  required: boolean
  defaultValue?: string | null
  enumValues?: string[]
}

@injectable()
export class SchemaBuilderService {
  constructor(
    @inject(ISchemaCache)
    private readonly cache: ISchemaCache,
  ) {}

  build(fields: ProjectFieldDefinition[]): z.ZodObject<Record<string, z.ZodType>> {
    const shape: Record<string, z.ZodType> = {}

    for (const field of fields) {
      let zodType = this.baseType(field)

      if (!field.required) zodType = zodType.optional() as z.ZodType
      if (field.defaultValue != null)
        zodType = zodType.default(this.parseDefault(field.type, field.defaultValue)) as z.ZodType

      shape[field.id] = zodType
    }

    return z.object(shape)
  }

  buildForProject(
    projectId: string,
    fields: ProjectFieldDefinition[],
  ): z.ZodObject<Record<string, z.ZodType>> {
    const cached = this.cache.get(projectId)
    if (cached) return cached

    const schema = this.build(fields)
    this.cache.set(projectId, schema)
    return schema
  }

  async invalidate(projectId: string): Promise<void> {
    await this.cache.invalidate(projectId)
  }

  private baseType(field: ProjectFieldDefinition): z.ZodType {
    switch (field.type) {
      case 'string':
        return z.string()
      case 'number':
        return z.coerce.number()
      case 'boolean':
        return z.coerce.boolean()
      case 'date':
        return z.coerce.date()
      case 'enum':
        return z.enum(field.enumValues as [string, ...string[]])
    }
  }

  private parseDefault(type: FieldType, raw: string): unknown {
    switch (type) {
      case 'number':
        return Number(raw)
      case 'boolean':
        return raw === 'true'
      case 'date':
        return new Date(raw)
      default:
        return raw
    }
  }
}
