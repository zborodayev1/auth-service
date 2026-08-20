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
import { UuidIdGenerator } from '@infra/uuid/UuidIdGenerator'
import { JwtClientAccessTokenService } from '@infra/jwt/JwtClientAccessTokenService'
import { JwtUserAccessTokenService } from '@infra/jwt/JwtUserAccessTokenService'
import { HashProjectApiKeyService } from '@infra/crypto/HashProjectApiKeyService'
import { PinoLogger } from '@infra/pino/PinoLogger'
import { Resend } from 'resend'
import { ResendEmailService } from '@infra/resend/ResendEmailService'
import { IEmailService } from '@ports/IEmailService'
import { EmailVerificationService } from '@services/email/EmailVerificationService'

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

    if (process.env['NODE_ENV'] === 'test') {
      container.bind(IEmailService).toConstantValue({
        sendPasswordResetEmail: async () => {
          /* empty */
        },
        sendEmailVerificationEmail: async () => {
          /* empty */
        },
      })
    } else {
      container.bind(IEmailService).to(ResendEmailService).inSingletonScope()
      container
        .bind(Resend)
        .toDynamicValue(() => new Resend(process.env['RESEND_API_KEY']))
        .inSingletonScope()
    }

    container.bind(EmailVerificationService).toSelf().inSingletonScope()
  }
}
