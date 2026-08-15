import { Container, injectable } from 'inversify'
import { ServiceContext } from '../ServiceContext'

import { CreateProjectHandler } from '@app/commands/project/CreateProject/CreateProjectHandler'
import { AddProjectFieldHandler } from '@app/commands/project/AddProjectField/AddProjectFieldHandler'
import { UpdateProjectFieldHandler } from '@app/commands/project/UpdateProjectField/UpdateProjectFieldHandler'
import { DeleteProjectFieldHandler } from '@app/commands/project/DeleteProjectField/DeleteProjectFieldHandler'
import { RecoverProjectFieldHandler } from '@app/commands/project/RecoverProjectField/RecoverProjectFieldHandler'
import { RenameProjectHandler } from '@app/commands/project/RenameProject/RenameProjectHandler'
import { DeleteProjectHandler } from '@app/commands/project/DeleteProject/DeleteProjectHandler'
import { RotateApiKeyHandler } from '@app/commands/project/RotateApiKey/RotateApiKeyHandler'
import { RenameApiKeyHandler } from '@app/commands/project/RenameApiKey/RenameApiKeyHandler'
import { DeleteProjectUserHandler } from '@app/commands/project/DeleteProjectUser/DeleteProjectUserHandler'
import { UpdateProjectUserFieldHandler } from '@app/commands/project/UpdateProjectUserField/UpdateProjectUserFieldHandler'
import { GetProjectFieldsHandler } from '@app/queries/project/GetProjectFields/GetProjectFieldsHandler'
import { GetProjectHandler } from '@app/queries/project/GetProject/GetProjectHandler'
import { GetProjectApiKeyHandler } from '@app/queries/project/GetProjectApiKey/GetProjectApiKeyHandler'
import { GetProjectUsersHandler } from '@app/queries/project/GetProjectUsers/GetProjectUsersHandler'
import { GetProjectUserHandler } from '@app/queries/project/GetProjectUser/GetProjectUserHandler'

import { ApiKeyService } from '@services/apiKey/ApiKeyService'
import { SchemaBuilderService } from '@services/schema/SchemaBuilderService'
import { ProjectAccessService } from '@services/project/ProjectAccessService'
import { UserFieldService } from '@services/user/UserFieldService'
import { ProjectFieldFactory } from '@factories/ProjectFieldFactory'

import { ProjectController } from '@presentation/http/controllers/ProjectController'

@injectable()
export class ProjectContext implements ServiceContext {
  register(container: Container): void {
    container.bind(CreateProjectHandler).toSelf()
    container.bind(AddProjectFieldHandler).toSelf()
    container.bind(UpdateProjectFieldHandler).toSelf()
    container.bind(DeleteProjectFieldHandler).toSelf()
    container.bind(RecoverProjectFieldHandler).toSelf()
    container.bind(RenameProjectHandler).toSelf()
    container.bind(DeleteProjectHandler).toSelf()
    container.bind(RotateApiKeyHandler).toSelf()
    container.bind(RenameApiKeyHandler).toSelf()
    container.bind(DeleteProjectUserHandler).toSelf()
    container.bind(UpdateProjectUserFieldHandler).toSelf()
    container.bind(GetProjectFieldsHandler).toSelf()
    container.bind(GetProjectHandler).toSelf()
    container.bind(GetProjectApiKeyHandler).toSelf()
    container.bind(GetProjectUsersHandler).toSelf()
    container.bind(GetProjectUserHandler).toSelf()

    container.bind(ApiKeyService).toSelf().inSingletonScope()
    container.bind(SchemaBuilderService).toSelf().inSingletonScope()
    container.bind(ProjectAccessService).toSelf().inSingletonScope()
    container.bind(UserFieldService).toSelf().inSingletonScope()
    container.bind(ProjectFieldFactory).toSelf().inSingletonScope()

    container.bind(ProjectController).toSelf()
  }
}
