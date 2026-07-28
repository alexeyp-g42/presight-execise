# Setup and Run Instructions

A full-stack user directory application. Includes a React client, a Node.js/Express API, and a SQLite database used as the persisted source of truth. Docker Compose is provided for one-command local runs.

## Contents

- [Prerequisites](#prerequisites)
- [Repository layout](#repository-layout)
- [Local development](#local-development)
- [Database seeding](#database-seeding)
- [Docker Compose](#docker-compose)
- [Tests](#tests)
- [API reference](#api-reference)
- [Environment variables](#environment-variables)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- **Node.js 22** (uses the built-in `fetch` global; earlier majors will not run the API healthcheck).
- **Yarn 1 (Classic)** — the workspace uses Yarn 1 lockfile format. `corepack enable` is the easiest way to get the right version.
- **Docker Desktop** or another engine with the **Compose v2 plugin** (`docker compose`, not the legacy `docker-compose`).

Verify:

```bash
node --version    # v22.x
yarn --version    # 1.22.x
docker compose version
```

## Repository layout

```
.
├── client/                # React 19 + Vite + Tailwind (SPA)
├── server/                # Express 5 + better-sqlite3 (API)
├── shared/                # DTOs shared between client and server
├── docker-compose.yml     # api + web services
└── package.json           # Yarn workspaces root
```

## Local development

Install workspace dependencies once from the repo root:

```bash
yarn install
```

Run the API and the web client in **two terminals**:

```bash
# terminal 1 — API on http://localhost:3001
yarn workspace presight-server dev

# terminal 2 — client on http://localhost:5173 (proxies /api → :3001)
yarn workspace presight-client dev
```

Open <http://localhost:5173>.

On first API start the SQLite file is created at `server/data/users.db` and auto-seeded with ~5,000 users. Subsequent starts reuse it.

## Database seeding

Seeding is automatic on API boot when the users table is empty. To seed explicitly (for example after wiping the file):

```bash
yarn workspace presight-server seed
```

To force a fresh seed, delete the DB file and restart the API:

```bash
rm server/data/users.db
yarn workspace presight-server dev
```

The seed is deterministic (fixed Faker RNG seed) so runs produce the same dataset.

## Docker Compose

Build and run the full stack:

```bash
docker compose up --build
# open http://localhost:8080
```

Services:

| Service | Port | Notes |
| --- | --- | --- |
| `api` | `3001` | Express API. Auto-seeds on first start. SQLite persisted in the `api_data` named volume at `/data/users.db`. |
| `web` | `8080` | Nginx serving the Vite production build; proxies `/api/*` to the `api` service. |

Everyday operations:

```bash
docker compose up -d --build   # start detached
docker compose logs -f api     # follow API logs
docker compose down            # stop, keep DB volume
docker compose down -v         # stop and WIPE the DB volume
```

The client only reaches the API through the nginx `/api` proxy, so nothing has to be exposed on the browser side beyond port 8080.

## Tests

```bash
yarn workspace presight-server test    # Vitest + supertest against :memory: SQLite
yarn workspace presight-client test    # Vitest + React Testing Library
```

Both suites run in seconds and are deterministic (seeded fixtures, no network).

## API reference

Base path: `/api`.

### `GET /api/health`

Liveness probe. Returns `{ "ok": true }`.

### `GET /api/users`

Paginated user list.

| Query param | Type | Default | Notes |
| --- | --- | --- | --- |
| `q` | string | `""` | Case-insensitive substring match on `first_name + " " + last_name`. |
| `hobbies` | csv | `""` | User must have **all** listed hobbies (AND). |
| `nationalities` | csv | `""` | User must match **any** listed nationality (OR). |
| `sort` | `first_name` \| `last_name` \| `age` \| `nationality` | `last_name` | Invalid values return 400. |
| `dir` | `asc` \| `desc` | `asc` | Invalid values return 400. |
| `cursor` | opaque string | — | Value returned by the previous page's `nextCursor`. |
| `limit` | integer | `50` | Clamped to `[1, 200]`. |

Response:

```json
{
  "items": [ { "id": 1, "avatar": "…", "first_name": "…", "last_name": "…", "age": 30, "nationality": "…", "hobbies": ["chess"] } ],
  "nextCursor": "eyJ2Ijoi…",
  "hasMore": true
}
```

Pagination uses keyset (seek) cursors over the tuple `(sort_value, id)`. `id` is the final tie-breaker so results are deterministic and pages contain no duplicates or gaps under any active sort.

### `GET /api/facets`

Top 20 hobbies and top 20 nationalities for the **currently applied** filter state.

| Query param | Type | Default | Notes |
| --- | --- | --- | --- |
| `q` | string | `""` | Same semantics as `/api/users`. |
| `hobbies` | csv | `""` | Same semantics (AND). |
| `nationalities` | csv | `""` | Same semantics (OR). |

Response:

```json
{
  "hobbies":       [ { "value": "chess",         "count": 812 } ],
  "nationalities": [ { "value": "United States", "count": 214 } ]
}
```

### Error shape

All errors return the same JSON envelope:

```json
{ "error": { "code": "validation_error", "message": "…" } }
```

Codes: `validation_error` (400), `invalid_cursor` (400), `not_found` (404), `internal_error` (500).

## Environment variables

| Variable | Default | Used by | Notes |
| --- | --- | --- | --- |
| `PORT` | `3001` | server | API port. |
| `DB_PATH` | `./data/users.db` | server | SQLite file path. Docker sets this to `/data/users.db` (backed by the `api_data` volume). |

The client's dev server proxies `/api` to `http://localhost:3001` (see `client/vite.config.ts`). In Docker, nginx proxies to `http://api:3001` (see `client/nginx.conf`).

## Troubleshooting

- **Port 5173 / 3001 / 8080 already in use** — stop the conflicting process or export a different `PORT` before starting the affected service.
- **Docker healthcheck fails on `api`** — check `docker compose logs api`. The most common cause is a corrupted DB volume; reset with `docker compose down -v`.
- **API returns an empty list right after Docker start** — the auto-seed runs on first boot; if it appears stuck, `docker compose logs api` will show `empty db at /data/users.db; seeding...` followed by completion.
- **Client shows `HTTP 500` on load** — the API is not reachable. In local dev confirm the Vite proxy target (`localhost:3001`) is up; in Docker confirm the `api` service is `healthy`.
- **Fresh dataset needed** — either delete `server/data/users.db` (local) or run `docker compose down -v` (Docker) and restart.
