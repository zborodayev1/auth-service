import z from 'zod'

//
// Primitives
//

const UserEmailSchema = z.email()

const UserPasswordSchema = z.string().min(8)

const UserDeviceNameSchema = z.string()

// const UserIdSchema = z.uuid()

const UserFieldIdSchema = z.uuid()

const UserFieldValueSchema = z.union([z.string(), z.number(), z.boolean()])

const UserFieldsSchema = z.record(z.string(), z.unknown())

//
// Base schemas
//

export const UserSchema = z.object({
  email: UserEmailSchema,
  password: UserPasswordSchema,
  deviceName: UserDeviceNameSchema.optional(),
})

//
// Use-case schemas
//

export const RegisterUserSchema = UserSchema.extend({
  fields: UserFieldsSchema,
})

export const LoginUserSchema = UserSchema.pick({
  email: true,
  password: true,
  deviceName: true,
})

export const ChangeUserEmailSchema = z.object({
  newEmail: UserEmailSchema,
  password: UserPasswordSchema,
})

export const ChangeUserPasswordSchema = z.object({
  currentPassword: UserPasswordSchema,
  newPassword: UserPasswordSchema,
})

export const DeleteUserSelfSchema = z.object({
  password: UserPasswordSchema,
})

//
// User fields
//

export const UserFieldParamsSchema = z.object({
  fieldId: UserFieldIdSchema,
})

export const SetUserFieldBodySchema = z.object({
  value: UserFieldValueSchema,
})
