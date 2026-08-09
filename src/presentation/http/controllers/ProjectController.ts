import { injectable, inject } from 'inversify'
import type { Request, Response } from 'express'

import { AddProjectFieldHandler } from '@app/commands/project/AddProjectField/AddProjectFieldHandler'
import { AddProjectFieldCommand } from '@app/commands/project/AddProjectField/AddProjectFieldCommand'
import { CreateProjectHandler } from '@app/commands/project/CreateProject/CreateProjectHandler'
import { CreateProjectCommand } from '@app/commands/project/CreateProject/CreateProjectCommand'
import { DeleteProjectFieldHandler } from '@app/commands/project/DeleteProjectField/DeleteProjectFieldHandler'
import { DeleteProjectFieldCommand } from '@app/commands/project/DeleteProjectField/DeleteProjectFieldCommand'
import { RecoverProjectFieldHandler } from '@app/commands/project/RecoverProjectField/RecoverProjectFieldHandler'
import { RecoverProjectFieldCommand } from '@app/commands/project/RecoverProjectField/RecoverProjectFieldCommand'
import { UpdateProjectFieldHandler } from '@app/commands/project/UpdateProjectField/UpdateProjectFieldHandler'
import { UpdateProjectFieldCommand } from '@app/commands/project/UpdateProjectField/UpdateProjectFieldCommand'
import { RenameProjectHandler } from '@app/commands/project/RenameProject/RenameProjectHandler'
import { RenameProjectCommand } from '@app/commands/project/RenameProject/RenameProjectCommand'
import { DeleteProjectHandler } from '@app/commands/project/DeleteProject/DeleteProjectHandler'
import { DeleteProjectCommand } from '@app/commands/project/DeleteProject/DeleteProjectCommand'
import { RotateApiKeyHandler } from '@app/commands/project/RotateApiKey/RotateApiKeyHandler'
import { RotateApiKeyCommand } from '@app/commands/project/RotateApiKey/RotateApiKeyCommand'
import { RenameApiKeyHandler } from '@app/commands/project/RenameApiKey/RenameApiKeyHandler'
import { RenameApiKeyCommand } from '@app/commands/project/RenameApiKey/RenameApiKeyCommand'
import { DeleteProjectUserHandler } from '@app/commands/project/DeleteProjectUser/DeleteProjectUserHandler'
import { DeleteProjectUserCommand } from '@app/commands/project/DeleteProjectUser/DeleteProjectUserCommand'
import { UpdateProjectUserFieldHandler } from '@app/commands/project/UpdateProjectUserField/UpdateProjectUserFieldHandler'
import { UpdateProjectUserFieldCommand } from '@app/commands/project/UpdateProjectUserField/UpdateProjectUserFieldCommand'

import { GetProjectFieldsHandler } from '@app/queries/project/GetProjectFields/GetProjectFieldsHandler'
import { GetProjectFieldsQuery } from '@app/queries/project/GetProjectFields/GetProjectFieldsQuery'
import { GetProjectHandler } from '@app/queries/project/GetProject/GetProjectHandler'
import { GetProjectQuery } from '@app/queries/project/GetProject/GetProjectQuery'
import { GetProjectApiKeyHandler } from '@app/queries/project/GetProjectApiKey/GetProjectApiKeyHandler'
import { GetProjectApiKeyQuery } from '@app/queries/project/GetProjectApiKey/GetProjectApiKeyQuery'
import { GetProjectUsersHandler } from '@app/queries/project/GetProjectUsers/GetProjectUsersHandler'
import { GetProjectUsersQuery } from '@app/queries/project/GetProjectUsers/GetProjectUsersQuery'
import { GetProjectUserHandler } from '@app/queries/project/GetProjectUser/GetProjectUserHandler'
import { GetProjectUserQuery } from '@app/queries/project/GetProjectUser/GetProjectUserQuery'
import { GetProjectUserFieldsHandler } from '@app/queries/project/GetProjectUserFields/GetProjectUserFieldsHandler'
import { GetProjectUserFieldsQuery } from '@app/queries/project/GetProjectUserFields/GetProjectUserFieldsQuery'

import { CreateProjectSchema } from '../validators/project/CreateProjectValidator'
import { AddProjectFieldSchema } from '../validators/project/AddProjectFieldValidator'
import { UpdateProjectFieldSchema } from '../validators/project/UpdateProjectFieldValidator'
import { ProjectIdParamSchema } from '../validators/project/ProjectIdParamValidator'
import { FieldIdParamSchema } from '../validators/project/FieldIdParamValidator'
import { RenameProjectSchema } from '../validators/project/RenameProjectValidator'
import { RenameApiKeySchema } from '../validators/project/RenameApiKeyValidator'
import { RotateApiKeySchema } from '../validators/project/RotateApiKeyValidator'
import { UserIdParamSchema } from '../validators/project/UserIdParamValidator'
import { PaginationQuerySchema } from '../validators/project/PaginationQueryValidator'
import {
  UpdateProjectUserFieldBodySchema,
  UpdateProjectUserFieldParamSchema,
} from '../validators/project/UpdateProjectUserFieldValidator'
import { DeleteProjectFieldQuerySchema } from '../validators/project/DeleteProjectFieldValidator'

@injectable()
export class ProjectController {
  constructor(
    @inject(CreateProjectHandler)
    private readonly createHandler: CreateProjectHandler,
    @inject(AddProjectFieldHandler)
    private readonly addFieldHandler: AddProjectFieldHandler,
    @inject(UpdateProjectFieldHandler)
    private readonly updateFieldHandler: UpdateProjectFieldHandler,
    @inject(DeleteProjectFieldHandler)
    private readonly deleteFieldHandler: DeleteProjectFieldHandler,
    @inject(RecoverProjectFieldHandler)
    private readonly recoverFieldHandler: RecoverProjectFieldHandler,
    @inject(RenameProjectHandler)
    private readonly renameProjectHandler: RenameProjectHandler,
    @inject(DeleteProjectHandler)
    private readonly deleteProjectHandler: DeleteProjectHandler,
    @inject(RotateApiKeyHandler)
    private readonly rotateApiKeyHandler: RotateApiKeyHandler,
    @inject(RenameApiKeyHandler)
    private readonly renameApiKeyHandler: RenameApiKeyHandler,
    @inject(DeleteProjectUserHandler)
    private readonly deleteUserHandler: DeleteProjectUserHandler,
    @inject(UpdateProjectUserFieldHandler)
    private readonly updateUserFieldHandler: UpdateProjectUserFieldHandler,
    @inject(GetProjectFieldsHandler)
    private readonly getFieldsHandler: GetProjectFieldsHandler,
    @inject(GetProjectHandler)
    private readonly getProjectHandler: GetProjectHandler,
    @inject(GetProjectApiKeyHandler)
    private readonly getApiKeyHandler: GetProjectApiKeyHandler,
    @inject(GetProjectUsersHandler)
    private readonly getUsersHandler: GetProjectUsersHandler,
    @inject(GetProjectUserHandler)
    private readonly getUserHandler: GetProjectUserHandler,
    @inject(GetProjectUserFieldsHandler)
    private readonly getUserFieldsHandler: GetProjectUserFieldsHandler,
  ) {}

  async create(req: Request, res: Response): Promise<void> {
    const body = CreateProjectSchema.parse(req.body)

    const { projectId, apiKey } = await this.createHandler.execute(
      new CreateProjectCommand(body.name, req.auth.clientId),
    )

    res.status(201).json({ projectId, apiKey })
  }

  async getProject(req: Request, res: Response): Promise<void> {
    const { projectId } = ProjectIdParamSchema.parse(req.params)

    const result = await this.getProjectHandler.execute(
      new GetProjectQuery(projectId, req.auth.clientId),
    )

    res.status(200).json(result)
  }

  async renameProject(req: Request, res: Response): Promise<void> {
    const { projectId } = ProjectIdParamSchema.parse(req.params)
    const body = RenameProjectSchema.parse(req.body)

    const result = await this.renameProjectHandler.execute(
      new RenameProjectCommand(req.auth.clientId, projectId, body.name),
    )

    res.status(200).json(result)
  }

  async deleteProject(req: Request, res: Response): Promise<void> {
    const { projectId } = ProjectIdParamSchema.parse(req.params)

    const result = await this.deleteProjectHandler.execute(
      new DeleteProjectCommand(req.auth.clientId, projectId),
    )

    res.status(200).json(result)
  }

  async getApiKey(req: Request, res: Response): Promise<void> {
    const { projectId } = ProjectIdParamSchema.parse(req.params)

    const result = await this.getApiKeyHandler.execute(
      new GetProjectApiKeyQuery(projectId, req.auth.clientId),
    )

    res.status(200).json(result)
  }

  async rotateApiKey(req: Request, res: Response): Promise<void> {
    const { projectId } = ProjectIdParamSchema.parse(req.params)
    const body = RotateApiKeySchema.parse(req.body)

    const result = await this.rotateApiKeyHandler.execute(
      new RotateApiKeyCommand(req.auth.clientId, projectId, body.name),
    )

    res.status(200).json(result)
  }

  async renameApiKey(req: Request, res: Response): Promise<void> {
    const { projectId } = ProjectIdParamSchema.parse(req.params)
    const body = RenameApiKeySchema.parse(req.body)

    const result = await this.renameApiKeyHandler.execute(
      new RenameApiKeyCommand(req.auth.clientId, projectId, body.name),
    )

    res.status(200).json(result)
  }

  async getUsers(req: Request, res: Response): Promise<void> {
    const { projectId } = ProjectIdParamSchema.parse(req.params)
    const { limit, offset } = PaginationQuerySchema.parse(req.query)

    const result = await this.getUsersHandler.execute(
      new GetProjectUsersQuery(projectId, req.auth.clientId, { limit, offset }),
    )

    res.status(200).json(result)
  }

  async getUser(req: Request, res: Response): Promise<void> {
    const { userId } = UserIdParamSchema.parse(req.params)

    const result = await this.getUserHandler.execute(
      new GetProjectUserQuery(userId, req.auth.clientId),
    )

    res.status(200).json(result)
  }

  async getUserFields(req: Request, res: Response): Promise<void> {
    const { userId } = UserIdParamSchema.parse(req.params)

    const result = await this.getUserFieldsHandler.execute(
      new GetProjectUserFieldsQuery(userId, req.auth.clientId),
    )

    res.status(200).json(result)
  }

  async updateUserField(req: Request, res: Response): Promise<void> {
    const { userId, fieldId } = UpdateProjectUserFieldParamSchema.parse(req.params)
    const body = UpdateProjectUserFieldBodySchema.parse(req.body)

    const result = await this.updateUserFieldHandler.execute(
      new UpdateProjectUserFieldCommand(req.auth.clientId, userId, fieldId, body.value),
    )

    res.status(200).json(result)
  }

  async deleteUser(req: Request, res: Response): Promise<void> {
    const { projectId } = ProjectIdParamSchema.parse(req.params)
    const { userId } = UserIdParamSchema.parse(req.params)

    const result = await this.deleteUserHandler.execute(
      new DeleteProjectUserCommand(req.auth.clientId, projectId, userId),
    )

    res.status(200).json(result)
  }

  async addField(req: Request, res: Response): Promise<void> {
    const { projectId } = ProjectIdParamSchema.parse(req.params)
    const body = AddProjectFieldSchema.parse(req.body)

    const { fieldId } = await this.addFieldHandler.execute(
      new AddProjectFieldCommand(
        projectId,
        body.name,
        body.type,
        body.required,
        body.defaultValue ?? null,
        body.enumValues,
      ),
    )

    res.status(201).json({ fieldId })
  }

  async updateField(req: Request, res: Response): Promise<void> {
    const { projectId } = ProjectIdParamSchema.parse(req.params)
    const { fieldId } = FieldIdParamSchema.parse(req.params)
    const body = UpdateProjectFieldSchema.parse(req.body)

    const result = await this.updateFieldHandler.execute(
      new UpdateProjectFieldCommand(
        projectId,
        req.auth.clientId,
        fieldId,
        body.name,
        body.required,
        body.defaultValue ?? null,
        body.enumValues,
      ),
    )

    res.status(200).json(result)
  }

  async recoverField(req: Request, res: Response): Promise<void> {
    const { projectId } = ProjectIdParamSchema.parse(req.params)
    const { fieldId } = FieldIdParamSchema.parse(req.params)

    const result = await this.recoverFieldHandler.execute(
      new RecoverProjectFieldCommand(projectId, fieldId, req.auth.clientId),
    )

    res.status(200).json(result)
  }

  async deleteField(req: Request, res: Response): Promise<void> {
    const { projectId } = ProjectIdParamSchema.parse(req.params)
    const { fieldId } = FieldIdParamSchema.parse(req.params)
    const { force } = DeleteProjectFieldQuerySchema.parse(req.query)

    const result = await this.deleteFieldHandler.execute(
      new DeleteProjectFieldCommand(fieldId, projectId, req.auth.clientId, force),
    )

    res.status(200).json(result)
  }

  async getFields(req: Request, res: Response): Promise<void> {
    const { projectId } = ProjectIdParamSchema.parse(req.params)

    const fields = await this.getFieldsHandler.execute(new GetProjectFieldsQuery(projectId))

    res.status(200).json({ fields })
  }
}
