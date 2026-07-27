import z from 'zod'

export const ProjectIdParamSchema = z.object({
  projectId: z.uuid(),
})
