import type { FieldType } from '@aggregates/projectField/FieldType'
import { injectable } from 'inversify'
import z from 'zod'

export interface ProjectFieldDefinition {
  name: string
  type: FieldType
  required: boolean
  defaultValue?: string | null
  enumValues?: string[]
}

@injectable()
export class SchemaBuilderService {
  build(fields: ProjectFieldDefinition[]): z.ZodObject<Record<string, z.ZodType>> {
    const shape: Record<string, z.ZodType> = {}

    for (const field of fields) {
      let zodType = this.baseType(field)

      if (!field.required) zodType = zodType.optional() as z.ZodType
      if (field.defaultValue != null)
        zodType = zodType.default(this.parseDefault(field)) as z.ZodType

      shape[field.name] = zodType
    }

    return z.object(shape)
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

  private parseDefault(field: ProjectFieldDefinition): unknown {
    const raw = field.defaultValue!
    switch (field.type) {
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
