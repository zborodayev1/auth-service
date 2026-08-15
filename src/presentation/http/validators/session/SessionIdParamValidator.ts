import z from 'zod'

export const SessionIdParamSchema = z.object({ sessionId: z.uuid() })
