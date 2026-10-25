import { inject, injectable } from 'inversify'
import { RenameClientCommand } from './RenameClientCommand'
import { ClientRepository } from '@aggregates/client/ClientRepository'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { Name } from '@valueObjects/Name/Name'
import { NOT_FOUND_ERROR_CODES } from '@shared/errors/ErrorCodes'

interface RenameClientResult {
  name: string
}

@injectable()
export class RenameClientHandler {
  constructor(
    @inject(ClientRepository)
    private readonly clients: ClientRepository,
  ) {}

  async execute(command: RenameClientCommand): Promise<RenameClientResult> {
    const client = await this.clients.findById(command.clientId)
    if (!client)
      throw new NotFoundError('Client not found', NOT_FOUND_ERROR_CODES.RESOURCE_NOT_FOUND, {
        command: command,
      })

    const updated = client.reName(Name.create(command.name))

    await this.clients.save(updated)

    return { name: command.name }
  }
}
