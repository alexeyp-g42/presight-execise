# Presight Frontend Exercise

Build a small full-stack user directory application. The goal is to evaluate how you design a searchable, filterable, paginated UI backed by persisted data and clear API boundaries.

The application should include:

- A React client.
- A Node.js API server.
- A SQLite database used as the source of truth for user data.
- Docker configuration for running the application locally.

## Scenario

Users need to browse a large directory of people, search by name, and narrow results by nationality and hobbies. The filter sidebar should help users discover useful filters based on the result set they are currently viewing.

## Requirements

### Data Model

Seed a SQLite database with enough records to make pagination, infinite scroll, search, and filter counts meaningful.

Each user should have:

- `avatar`
- `first_name`
- `last_name`
- `age`
- `nationality`
- `hobbies`, from 0 to 10 hobbies per user

Choose a data model that supports the required behavior.

SQLite must be the persisted source of user data.

### API

Expose an API that supports:

- Paginated user results.
- Text filtering from user input across `first_name` and `last_name`.
- Filtering by one or more nationalities.
- Filtering by one or more hobbies.
- Sorting by `first_name`, `last_name`, `age`, and `nationality`.
- Pagination metadata so the client can determine whether more results are available.
- Top 20 hobbies for the active text filter and filter state, including `{ value, count }`.
- Top 20 nationalities for the active text filter and filter state, including `{ value, count }`.

The top 20 values and counts must reflect the currently applied text filter and selected filters, not the global dataset.

Filter semantics:

- Multiple selected hobbies should match users who have all selected hobbies.
- Multiple selected nationalities should match users from any selected nationality.
- Text, hobby, and nationality filters should apply together.

Sorting semantics:

- Sorted results must be deterministic. Use `id` as a final tie-breaker when values are equal.
- Pagination must respect the active sort without duplicate or missing users.

### Client

Build a React interface that includes:

- A text filter input for `first_name` and `last_name`.
- A virtualized, infinitely scrolling list of user cards.
- A sidebar containing the top 20 hobbies and top 20 nationalities for the current result set, including counts.
- Controls for applying and removing hobby and nationality filters.
- Controls for choosing sort field and sort direction.
- Loading, empty, and error states.
- A responsive layout that remains usable on desktop and mobile.

User cards should follow this structure:

```text
|----------------------------------|
| avatar      first_name+last_name |
|             nationality      age |
|                                  |
|             (2 hobbies) (+n)     |
|----------------------------------|
```

Show up to 2 hobbies on the card. If the user has more hobbies, display the remaining count as `+n`.

Use a virtual scroll implementation for the list.

When the text filter or selected filters change, the client must refresh both:

- The paginated user list.
- The top 20 hobbies and nationalities in the sidebar.

The text filter value, selected hobbies, selected nationalities, sort field, and sort direction must be reflected in the URL query string. Reloading or sharing the URL should restore the same view state.

## Implementation Notes

- Keep the database setup easy to run locally.
- Include seed logic or a documented command that creates the SQLite database.
- Include a `Dockerfile` and `docker-compose.yml` that can run the application locally.

## Evaluation Focus

We will pay particular attention to:

- Correct data persistence and API behavior.
- Correct filtering, sorting, pagination, and top 20 counts.
- Smooth infinite scrolling with virtualization.
- URL-synced state.
- Clear loading, empty, and error states.
- Easy local and Docker-based setup.

## Deliverables

Please provide:

- Source code for the React client and Node.js server.
- A `Dockerfile` and `docker-compose.yml`.
- Instructions for setup, database seeding, and running locally.
- Instructions for running with Docker Compose.

---

## Solution

### Stack

- **Server** — Node.js, Express 5, TypeScript, SQLite via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3), Faker for seed data
- **Client** — React 19, TypeScript, Vite, SCSS modules, TanStack Query, TanStack Virtual, React Router
- **Tooling** — Yarn workspaces + Lerna, Vitest, Supertest, ESLint, Prettier
- **Infrastructure** — Docker, Docker Compose

### Project layout

```text
server/
  src/
    app.ts        Express app and routes
    db.ts         SQLite connection and schema
    query.ts      Query string validation
    users.ts      Listing, cursor pagination and facet queries
    seeder.ts     Deterministic fake data generator
    seed.ts       Seed CLI
  test/           API tests (in-memory SQLite)
client/
  src/
    api/          HTTP client
    components/   UI components, one folder each with its SCSS module
    hooks/        URL state, data fetching, layout helpers
    styles/       SCSS variables, mixins, global styles
    types/        Shared types
    utils/        URL state serialization, flags, colour helpers
```

### Data model

```text
users(id, avatar, first_name, last_name, age, nationality)
user_nationalities(user_id, nationality, is_primary)
hobbies(id, name)
user_hobbies(user_id, hobby_id)
```

About 15% of users have two nationalities. Every nationality is stored in `user_nationalities`, and `users.nationality` holds the primary one, which is what sorting uses. Hobbies live in a join table, so "has all selected hobbies" filters and hobby counts are plain indexed SQL. Ages range from 0 to 100, weighted towards working age. Every sortable column has a composite `(column, id)` index.

### API

`GET /api/users`

| Param         | Description                                                    |
| ------------- | -------------------------------------------------------------- |
| `search`      | Text matched against `first_name` and `last_name`              |
| `nationality` | Repeatable, matches users holding **any** selected nationality |
| `hobby`       | Repeatable, matches users with **all** selected hobbies        |
| `sort`        | `first_name` (default), `last_name`, `age`, `nationality`      |
| `order`       | `asc` (default) or `desc`                                      |
| `limit`       | Page size, 1–100 (default 30)                                  |
| `cursor`      | `nextCursor` from the previous page                            |

```json
{ "data": [{ "id": 1, "nationality": "German", "nationalities": ["German", "Turkish"], ... }], "total": 1438, "hasMore": true, "nextCursor": "WzgwLDE4NjkzXQ" }
```

Pagination is keyset based on `(sort column, id)`, so pages never overlap or skip users regardless of the active sort. Every search term must match either the first or the last name, so `ann lee` finds "Anna Lee".

`GET /api/users/facets` accepts the same `search`, `nationality` and `hobby` params and returns the top 20 of each:

```json
{ "hobbies": [{ "value": "Reading", "count": 403 }], "nationalities": [{ "value": "German", "count": 812 }] }
```

Both lists are counted over the current result set, so they apply the search and every selected nationality and hobby. A user with two nationalities is counted under both.

Invalid params return `400` with `{ "error": "..." }`.

### Client

- Search, filters, sort field and direction live in the URL (`?q=ann&nationality=German&hobby=Chess&sort=age&order=desc`), so reloading or sharing a link restores the view. Typing replaces the history entry, while filter and sort changes push one so Back works.
- The list is virtualized by rows, and the column count adapts to the list width. The next page is fetched as you scroll near the end.
- Changing the search or filters refetches both the list and the sidebar counts.
- Loading skeletons, empty results, request errors with retry, and inline retry for a failed next page are all handled.
- Below 900px the sidebar becomes a slide-in drawer.

### Running locally

Requirements: Node.js 20.17+ and Yarn 1.

```bash
yarn install
yarn seed          # optional, creates server/data/users.db with 20,000 users
yarn start         # API on http://localhost:3001, client on http://localhost:5173
```

The server seeds an empty database automatically on first start. To reseed with a different size, run `yarn --cwd server seed 50000`.

| Variable     | Default                 | Description                         |
| ------------ | ----------------------- | ----------------------------------- |
| `PORT`       | `3001`                  | API port                            |
| `DB_PATH`    | `server/data/users.db`  | SQLite file                         |
| `SEED_COUNT` | `20000`                 | Users created when the DB is empty  |
| `STATIC_DIR` |                         | Serve a built client from this path |
| `API_URL`    | `http://localhost:3001` | Vite dev proxy target               |

Other scripts:

```bash
yarn test                     # server and client tests
yarn build                    # production builds
yarn --cwd client lint
```

### Running with Docker Compose

```bash
docker compose up --build
```

Open http://localhost:3001. One container serves both the API and the built client. If port 3001 is busy (for example, the local dev server is running), pick another one with `APP_PORT=3080 docker compose up --build`. The database lives in the `users-data` volume and is seeded on first start. Run `docker compose down -v` to reset it.
