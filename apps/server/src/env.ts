/**
 * Single source of truth for environment variables and their defaults. See `.env.example` for the
 * full list of variables `dev` will pick up from `.env`; `start` reads only real process env vars.
 */
export const env = {
    port: Number(process.env.PORT ?? 3000),
    databaseFile: process.env.DATABASE_FILE ?? 'data/user_data.db',
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5175',
}
