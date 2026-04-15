import dotenv from 'dotenv'

export const PORT = Number(process.env['PORT'] ?? 3000)

export const loadEnv = (): void => {
  dotenv.config()
}
