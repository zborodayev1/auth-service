export interface ProjectApiKeyPayload {
  projectId: string
}

export interface ProjectApiKeyService {
  verify(rawKey: string): Promise<ProjectApiKeyPayload>
}

export const ProjectApiKeyService: unique symbol = Symbol('ProjectApiKeyService')
