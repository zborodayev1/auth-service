import { AdminRegisterClientCommand } from '@app/commands/client/admin/AdminRegisterClient/AdminRegisterClientCommand'
import type { AdminRegisterClientResult } from '@app/commands/client/admin/AdminRegisterClient/AdminRegisterClientHandler'
import { AdminRegisterClientHandler } from '@app/commands/client/admin/AdminRegisterClient/AdminRegisterClientHandler'
import type { Container } from 'inversify'

export async function seedClient(
  container: Container,
  overrides?: { name?: string; email?: string; password?: string },
): Promise<AdminRegisterClientResult> {
  return await container
    .get(AdminRegisterClientHandler)
    .execute(
      new AdminRegisterClientCommand(
        overrides?.name ?? 'Test Client',
        overrides?.email ?? 'test@example.com',
        overrides?.password ?? 'password123',
        null,
        null,
        null,
      ),
    )
}
