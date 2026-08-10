import { Container, injectable } from 'inversify'
import { ServiceContext } from '../ServiceContext'

import { PasswordHasher } from '@ports/PasswordHasher'
import { Hasher } from '@ports/Hasher'
import { KeyGenerator } from '@ports/KeyGenerator'
import { IdGenerator } from '@ports/IdGenerator'
import { ClientAccessTokenService } from '@ports/ClientAccessTokenService'
import { UserAccessTokenService } from '@ports/UserAccessTokenService'
import { ProjectApiKeyService } from '@ports/ProjectApiKeyService'
import { ILogger } from '@ports/logger/ILogger'

import { BcryptPasswordHasher } from '@infra/crypto/BcryptIPasswordHasher'
import { CryptoHasher } from '@infra/crypto/CryptoHasher'
import { CryptoKeyGenerator } from '@infra/crypto/CryptoKeyGenerator'
import { UuidIdGenerator } from '@infra/identity/UuidIdGenerator'
import { JwtClientAccessTokenService } from '@infra/jwt/JwtClientAccessTokenService'
import { JwtUserAccessTokenService } from '@infra/jwt/JwtUserAccessTokenService'
import { HashProjectApiKeyService } from '@infra/crypto/HashProjectApiKeyService'
import { PinoLogger } from '@infra/logger/PinoLogger'

@injectable()
export class AdaptersContext implements ServiceContext {
  register(container: Container): void {
    container.bind(PasswordHasher).to(BcryptPasswordHasher).inSingletonScope()
    container.bind(Hasher).to(CryptoHasher).inSingletonScope()
    container.bind(KeyGenerator).to(CryptoKeyGenerator).inSingletonScope()
    container.bind(IdGenerator).to(UuidIdGenerator).inSingletonScope()
    container.bind(ClientAccessTokenService).to(JwtClientAccessTokenService).inSingletonScope()
    container.bind(UserAccessTokenService).to(JwtUserAccessTokenService).inSingletonScope()
    container.bind(ProjectApiKeyService).to(HashProjectApiKeyService).inSingletonScope()
    container.bind(ILogger).to(PinoLogger).inSingletonScope()
  }
}
