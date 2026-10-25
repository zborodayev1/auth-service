import z from 'zod'

/*
 * Primitives
 */

const ClientEmailSchema = z.email()

const ClientPasswordSchema = z.string().min(8).max(64)

const ClientDeviceNameSchema = z.string()

const ClientNameSchema = z.string().min(8).max(64)

const ClientTokenSchema = z.string().length(64)

/*
 * Base schemas
 */

export const ClientSchema = z.object({
  email: ClientEmailSchema,

  password: ClientPasswordSchema,

  deviceName: ClientDeviceNameSchema.optional(),
})

/*
 * Use-case schemas
 */

export const RequestRegisterClientSchema = ClientSchema.extend({
  name: ClientNameSchema,
})

export const ConfirmRegisterClientSchema = z.object({
  token: ClientTokenSchema,

  deviceName: ClientDeviceNameSchema.optional(),
})

export const LoginClientSchema = ClientSchema.pick({
  email: true,

  password: true,

  deviceName: true,
})

export const RequestChangeClientEmailSchema = z.object({
  newEmail: ClientEmailSchema,

  password: ClientPasswordSchema,
})

export const ConfirmChangeClientEmailSchema = z.object({
  token: ClientTokenSchema,
})

export const ChangeClientPasswordSchema = z.object({
  currentPassword: ClientPasswordSchema,

  newPassword: ClientPasswordSchema,
})

export const ChangeClientNameSchema = z.object({
  name: ClientNameSchema,
})

export const RequestPasswordResetClientSchema = z.object({
  email: ClientEmailSchema,
})

export const ConfirmPasswordResetClientSchema = z.object({
  token: ClientTokenSchema,

  deviceName: ClientDeviceNameSchema.optional(),
})
