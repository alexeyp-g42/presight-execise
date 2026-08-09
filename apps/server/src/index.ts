import express, { type ErrorRequestHandler } from 'express'
import { z } from 'zod'
import {
    type Hobby,
    hobbySchema,
    type Nationality,
    nationalitySchema,
    type UserSearchResult,
    userSearchQuerySchema,
    userSearchResultSchema,
} from '@presight/schema'
import { db } from './db.ts'
import { env } from './env.ts'
import { searchUsers } from './user-search.ts'

const app = express()

/**
 * The client calls this server directly rather than through a dev proxy, so it is a separate origin
 * and needs CORS. `CORS_ORIGIN` is a comma-separated allowlist; `*` allows any origin.
 */
const allowedOrigins = new Set(
    env.corsOrigin
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
)

app.use((req, res, next) => {
    const { origin } = req.headers
    if (origin !== undefined && (allowedOrigins.has('*') || allowedOrigins.has(origin))) {
        res.setHeader('Access-Control-Allow-Origin', origin)
        // The response varies by origin, so it must not be cached across origins.
        res.setHeader('Vary', 'Origin')
    }

    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
        res.setHeader('Access-Control-Max-Age', '86400')
        res.sendStatus(204)
        return
    }

    next()
})

/** Rows leave the database untyped, so every response is parsed before it reaches the client. */
const hobbyListSchema = z.array(hobbySchema)
const nationalityListSchema = z.array(nationalitySchema)

const selectHobbies = db.prepare('SELECT id, label FROM hobbies ORDER BY label')
const selectNationalities = db.prepare('SELECT code, label FROM nationalities ORDER BY label')

app.get('/hobbies', (_req, res) => {
    const hobbies: Hobby[] = hobbyListSchema.parse(selectHobbies.all())
    res.json(hobbies)
})

app.get('/nationalities', (_req, res) => {
    const nationalities: Nationality[] = nationalityListSchema.parse(selectNationalities.all())
    res.json(nationalities)
})

app.get('/users', (req, res) => {
    const { searchParams } = new URL(req.originalUrl, `http://${req.headers.host ?? 'localhost'}`)
    // A client that always serialises its whole filter state sends blanks (`?pagesize=&hobby_id=`);
    // treat those as "not provided" so they fall back to the defaults instead of failing validation.
    const rawQuery = Object.fromEntries([...searchParams].filter(([, value]) => value !== ''))
    const parsedQuery = userSearchQuerySchema.safeParse(rawQuery)

    if (!parsedQuery.success) {
        res.status(400).json({ error: 'Invalid query parameters', issues: z.treeifyError(parsedQuery.error) })
        return
    }

    const result: UserSearchResult = userSearchResultSchema.parse(searchUsers(parsedQuery.data))
    res.json(result)
})

const handleError: ErrorRequestHandler = (err, _req, res, _next) => {
    console.error(err)
    res.status(500).json({ error: 'Internal Server Error' })
}

app.use(handleError)

app.listen(env.port, () => {
    console.log(`Server listening on http://localhost:${env.port}`)
})
