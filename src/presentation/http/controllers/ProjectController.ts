import { injectable } from 'inversify'
import type { Request, Response } from 'express'

import { AddProjectFieldHandler } from '@app/commands/project/AddProjectField/AddProjectFieldHandler'
import { AddProjectFieldCommand } from '@app/commands/project/AddProjectField/AddProjectFieldCommand'
import { CreateProjectHandler } from '@app/commands/project/CreateProject/CreateProjectHandler'
import { CreateProjectCommand } from '@app/commands/project/CreateProject/CreateProjectCommand'
import { DeleteProjectFieldHandler } from '@app/commands/project/DeleteProjectField/DeleteProjectFieldHandler'
import { DeleteProjectFieldCommand } from '@app/commands/project/DeleteProjectField/DeleteProjectFieldCommand'
import { UpdateProjectFieldHandler } from '@app/commands/project/UpdateProjectField/UpdateProjectFieldHandler'
import { UpdateProjectFieldCommand } from '@app/commands/project/UpdateProjectField/UpdateProjectFieldCommand'
import { GetProjectFieldsHandler } from '@app/queries/project/GetProjectFields/GetProjectFieldsHandler'
import { GetProjectFieldsQuery } from '@app/queries/project/GetProjectFields/GetProjectFieldsQuery'

import { CreateProjectSchema } from '../validators/project/CreateProjectValidator'
import { AddProjectFieldSchema } from '../validators/project/AddProjectFieldValidator'
import { UpdateProjectFieldSchema } from '../validators/project/UpdateProjectFieldValidator'
import { ProjectIdParamSchema } from '../validators/project/ProjectIdParamValidator'
import { FieldIdParamSchema } from '../validators/project/FieldIdParamValidator'

@injectable()
export class ProjectController {
  constructor(
    private readonly createHandler: CreateProjectHandler,
    private readonly addFieldHandler: AddProjectFieldHandler,
    private readonly updateFieldHandler: UpdateProjectFieldHandler,
    private readonly deleteFieldHandler: DeleteProjectFieldHandler,
    private readonly getFieldsHandler: GetProjectFieldsHandler,
  ) {}

  async create(req: Request, res: Response): Promise<void> {
    const body = CreateProjectSchema.parse(req.body)

    const { projectId, apiKey } = await this.createHandler.execute(
      new CreateProjectCommand(body.name, req.auth.clientId),
    )

    res.status(201).json({ projectId, apiKey })
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
        fieldId,
        body.name,
        body.required,
        body.defaultValue ?? null,
        body.enumValues,
      ),
    )

    res.status(200).json(result)
  }

  async deleteField(req: Request, res: Response): Promise<void> {
    const { projectId } = ProjectIdParamSchema.parse(req.params)
    const { fieldId } = FieldIdParamSchema.parse(req.params)
    const force = req.query['force'] === 'true'

    const result = await this.deleteFieldHandler.execute(
      new DeleteProjectFieldCommand(fieldId, projectId, force),
    )

    res.status(200).json(result)
  }

  async getFields(req: Request, res: Response): Promise<void> {
    const { projectId } = ProjectIdParamSchema.parse(req.params)

    const fields = await this.getFieldsHandler.execute(new GetProjectFieldsQuery(projectId))

    res.status(200).json({ fields })
  }
}
