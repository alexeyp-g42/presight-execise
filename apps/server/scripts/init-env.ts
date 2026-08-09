import { copyFileSync, existsSync } from 'node:fs'

/**
 * Creates `.env` from `.env.example` for local dev, without ever clobbering an existing `.env`
 * (which may already hold values someone edited by hand).
 */
const ENV_EXAMPLE = new URL('../.env.example', import.meta.url)
const ENV_FILE = new URL('../.env', import.meta.url)

if (existsSync(ENV_FILE)) {
    console.log('.env already exists, leaving it untouched')
} else {
    copyFileSync(ENV_EXAMPLE, ENV_FILE)
    console.log('Created .env from .env.example')
}
