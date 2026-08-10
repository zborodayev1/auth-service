import { inject, injectable } from 'inversify'
import { RegisterUserCommand } from './RegisterUserCommand'
import { Email } from '@valueObjects/Email/Email'
import { ConflictError } from '@shared/errors/ConflictError'
import { UserRepository } from '@aggregates/user/UserRepository'
import { Password } from '@valueObjects/Password/Password'
import { IdGenerator } from '@ports/IdGenerator'
import { PasswordHasher } from '@ports/PasswordHasher'
import { User } from '@aggregates/user/User'
import { UserAuthService } from '@services/auth/UserAuthService'
import { ProjectFieldRepository } from '@aggregates/projectField/ProjectFieldRepository'
import { UserFieldValueRepository } from '@aggregates/userFieldValue/UserFieldValueRepository'
import { SchemaBuilderService } from '@services/schema/SchemaBuilderService'
import { UserFieldValue } from '@aggregates/userFieldValue/UserFieldValue'
import { UnitOfWork } from '@ports/UnitOfWork'

interface RegisterUserResult {
  userId: string
  accessToken: string
  refreshToken: string
}

@injectable()
export class RegisterUserHandler {
  constructor(
    @inject(UnitOfWork)
    private readonly unitOfWork: UnitOfWork,

    @inject(UserRepository)
    private readonly users: UserRepository,

    @inject(PasswordHasher)
    private readonly passwordHasher: PasswordHasher,

    @inject(IdGenerator)
    private readonly idGenerator: IdGenerator,

    @inject(UserAuthService)
    private readonly authService: UserAuthService,

    @inject(SchemaBuilderService) private readonly schemaBuilder: SchemaBuilderService,

    @inject(ProjectFieldRepository) private readonly projectFields: ProjectFieldRepository,

    @inject(UserFieldValueRepository) private readonly fieldValues: UserFieldValueRepository,
  ) {}
  async execute(command: RegisterUserCommand): Promise<RegisterUserResult> {
    const email = Email.create(command.email)

    const exists = await this.users.findByProjectAndEmail(command.projectId, email)
    if (exists) {
      throw new ConflictError(`Email already taken`, 'EMAIL_TAKEN', {
        email: email.toString(),
      })
    }

    Password.validateRaw(command.password)

    const hash = await this.passwordHasher.hash(command.password)
    const password = Password.fromHash(hash)

    const id = this.idGenerator.generate()

    const user = User.create({ id, projectId: command.projectId, email, password })

    const fields = await this.projectFields.findByProjectId(command.projectId)
    const schema = this.schemaBuilder.buildForProject(command.projectId, fields)

    const validated = schema.parse(command.fields)

    const values = fields
      .filter((f) => validated[f.name] !== undefined)
      .map((f) =>
        UserFieldValue.create({
          id: this.idGenerator.generate(),
          userId: user.id,
          fieldId: f.id,
          value: String(validated[f.name]),
        }),
      )

    const tokens = await this.unitOfWork.execute(async () => {
      await this.users.save(user)
      await this.fieldValues.saveMany(values)
      return this.authService.login({
        userId: user.id,
        projectId: command.projectId,
        userAgent: command.userAgent,
        ipAddress: command.ipAddress,
        deviceName: command.deviceName,
      })
    })

    return { userId: user.id, ...tokens }
  }
}
