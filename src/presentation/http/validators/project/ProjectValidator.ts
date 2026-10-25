import z from 'zod'

/*
 * Primitives
 */

const ProjectIdSchema = z.uuid()

const FieldIdSchema = z.uuid()

const UserIdSchema = z.uuid()

const ProjectNameSchema = z.string().min(8).max(64)

const ApiKeyNameSchema = z.string().min(8).max(64)

const ProjectFieldNameSchema = z.string().max(64)

const ProjectFieldTypeSchema = z.enum(['string', 'number', 'boolean', 'date', 'enum'])

const ProjectFieldDefaultValueSchema = z.string()

const ProjectFieldEnumValuesSchema = z.array(z.string())

/*
 * Base schemas
 */

export const ProjectSchema = z.object({
  name: ProjectNameSchema,
})

export const ProjectFieldSchema = z.object({
  name: ProjectFieldNameSchema,

  type: ProjectFieldTypeSchema,

  required: z.boolean(),

  defaultValue: ProjectFieldDefaultValueSchema.optional(),

  enumValues: ProjectFieldEnumValuesSchema,
})

/*
 * Project
 */

export const CreateProjectSchema = ProjectSchema

export const RenameProjectSchema = ProjectSchema

/*
 * API key
 */

export const RenameApiKeySchema = z.object({
  name: ApiKeyNameSchema,
})

export const RotateApiKeySchema = z.object({
  name: ApiKeyNameSchema.optional(),
})

/*
 * Project fields
 */

export const AddProjectFieldSchema = ProjectFieldSchema.superRefine((data, ctx) => {
  if (data.type === 'enum' && data.enumValues.length === 0) {
    ctx.addIssue({
      code: 'custom',
      message: 'Enum type requires at least one value',
      path: ['enumValues'],
    })
  }

  if (data.defaultValue !== undefined) {
    if (data.type === 'number' && isNaN(Number(data.defaultValue))) {
      ctx.addIssue({
        code: 'custom',
        message: 'defaultValue must be a valid number',
        path: ['defaultValue'],
      })
    }

    if (data.type === 'date' && isNaN(new Date(data.defaultValue).getTime())) {
      ctx.addIssue({
        code: 'custom',
        message: 'defaultValue must be a valid date',
        path: ['defaultValue'],
      })
    }

    if (data.type === 'enum' && !data.enumValues.includes(data.defaultValue)) {
      ctx.addIssue({
        code: 'custom',
        message: 'defaultValue must be one of enumValues',
        path: ['defaultValue'],
      })
    }

    if (data.type === 'boolean' && data.defaultValue !== 'true' && data.defaultValue !== 'false') {
      ctx.addIssue({
        code: 'custom',
        message: 'defaultValue must be "true" or "false"',
        path: ['defaultValue'],
      })
    }
  }
})

export const UpdateProjectFieldSchema = z
  .object({
    name: ProjectFieldNameSchema,

    required: z.boolean(),

    defaultValue: ProjectFieldDefaultValueSchema.optional(),

    enumValues: ProjectFieldEnumValuesSchema,
  })
  .superRefine((data, ctx) => {
    if (data.enumValues.length === 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'enumValues must contain at least one value',
        path: ['enumValues'],
      })
    }
  })

/*
 * Project users
 */

export const UpdateProjectUserFieldBodySchema = z.object({
  value: z.string(),
})

/*
 * Params
 */

export const ProjectIdParamSchema = z.object({
  projectId: ProjectIdSchema,
})

export const ProjectFieldParamsSchema = z.object({
  projectId: ProjectIdSchema,

  fieldId: FieldIdSchema,
})

export const UserIdParamSchema = z.object({
  userId: UserIdSchema,
})

export const UpdateProjectUserFieldParamSchema = z.object({
  userId: UserIdSchema,

  fieldId: FieldIdSchema,
})

/*
 * Queries
 */

export const PaginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),

  offset: z.coerce.number().int().min(0).default(0),
})

export const DeleteProjectFieldQuerySchema = z.object({
  force: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
})

/*
 * Types
 */

export type UpdateProjectFieldDto = z.infer<typeof UpdateProjectFieldSchema>
