import { inject, injectable } from 'inversify'
import { GetClientProfileQuery } from './GetClientProfileQuery'
import { ClientRepository } from '@aggregates/client/ClientRepository'
import { NotFoundError } from '@shared/errors/NotFoundError'

interface GetClientProfileResult {
  id: string
  name: string
  email: string
  createdAt: Date
}

@injectable()
export class GetClientProfileHandler {
  constructor(
    @inject(ClientRepository)
    private readonly clients: ClientRepository,
  ) {}

  async execute(query: GetClientProfileQuery): Promise<GetClientProfileResult> {
    const client = await this.clients.findById(query.clientId)

    if (!client) {
      throw new NotFoundError('Client not found', 'CLIENT_NOT_FOUND', { id: query.clientId })
    }

    return {
      id: client.id,
      name: client.name,
      email: client.email.toString(),
      createdAt: client.createdAt,
    }
  }
}
