import { join } from 'node:path'
import express, { type ErrorRequestHandler, type Express } from 'express'
import type { Db } from './db/connection.js'
import { QueryError } from './query/filters.js'
import { facetsRouter } from './routes/facets.js'
import { usersRouter } from './routes/users.js'

export interface AppOptions {
  clientDir?: string
}

const handleErrors: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof QueryError) {
    res.status(400).json({ error: { code: error.code, message: error.message, field: error.field } })
    return
  }

  console.error(error)
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Unexpected server error' } })
}

export function createApp(db: Db, options: AppOptions = {}): Express {
  const app = express()

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' })
  })
  app.use('/api/users', usersRouter(db))
  app.use('/api/facets', facetsRouter(db))

  if (options.clientDir) {
    app.use(express.static(options.clientDir))
    app.get(/^\/(?!api\/).*/, (_req, res) => {
      res.sendFile(join(options.clientDir as string, 'index.html'))
    })
  }

  app.use(handleErrors)
  return app
}
