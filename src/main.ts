import { bootstrap } from './bootstrap.js'

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection', err)
  process.exit(1)
})

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception', err)
  process.exit(1)
})

bootstrap()
