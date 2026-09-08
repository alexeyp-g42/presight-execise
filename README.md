# User Directory

A searchable, filterable directory of 50,000 people: a React client backed by an Express/SQLite API. Users can search by name, filter by nationality and hobbies, sort on four fields, and scroll through results with a virtualized infinite list; a sidebar shows the top 20 hobbies and nationalities for whatever is currently filtered, with counts.

## Requirements

- **Node 24** — an `.nvmrc` is provided (`nvm use`). Node 25 has no prebuilt binary for `better-sqlite3` yet, so installing on it falls back to a from-source build; stick to 24.
- **Yarn 1** (Classic) — the workspaces are wired for `yarn`, not `npm`.
- **Docker**, as an alternative to a local Node install — see [Docker](#docker) below.

## Quick start

```bash
yarn install
yarn seed
yarn dev
```

Then open `http://localhost:5173`. The API listens on port 4000; Vite's dev server proxies `/api/*` requests on 5173 through to it, so the client never talks to 4000 directly.

## Seeding

`yarn seed` creates `server/data/presight.db`, a SQLite database of 50,000 users (avatar, name, age, nationality, 0–10 hobbies each) plus their hobby associations, and reports how long it took:

```
$ yarn seed
Seeded 50000 users into data/presight.db in 311ms
```

Running it again is a no-op if the file already exists:

```
$ yarn seed
data/presight.db already exists. Re-run with --force to recreate it.
```

`yarn seed --force` deletes the existing database (and its WAL/SHM files) and recreates it from scratch.

## Docker

```bash
docker compose up --build
```

Then open `http://localhost:3000`. The container seeds the database automatically on first start if it finds no users — there is no separate seed step to run. Data persists in the `presight-data` named volume across restarts; `docker compose down -v` removes that volume and resets the app to an empty database on the next start.

The image is built in three stages (a build stage that compiles both workspaces, a stage that installs production-only dependencies, and a slim runtime stage that copies in just the compiled output and those dependencies) and comes out to about 291MB.

## Tests

```bash
yarn test                              # both suites: server 75 tests, client 51 tests
yarn workspace presight-server test    # server only
yarn workspace presight-client test    # client only
```

## API

Both endpoints live under `/api` and share the same filter query parameters.

| Parameter | Applies to | Notes |
|---|---|---|
| `q` | both | Name prefix filter, matched against `first_name` and `last_name` (see [Design decisions](#design-decisions)). |
| `nationalities` | both | Repeatable (`?nationalities=American&nationalities=Argentine`). Matches users from **any** listed nationality. |
| `hobbies` | both | Repeatable. Matches users who have **all** listed hobbies. |
| `sort` | `/api/users` only | One of `first_name`, `last_name`, `age`, `nationality`. Default `first_name`. |
| `order` | `/api/users` only | `asc` or `desc`. Default `asc`. |
| `cursor` | `/api/users` only | Opaque token from the previous page's `pageInfo.nextCursor`. Omit for the first page. |
| `limit` | `/api/users` only | Page size, 1–100. Default 30. |

A malformed value on any parameter returns `400` with a structured error, e.g. `GET /api/users?sort=bogus`:

```json
{"error":{"code":"INVALID_QUERY","message":"Invalid enum value. Expected 'first_name' | 'last_name' | 'age' | 'nationality', received 'bogus'","field":"sort"}}
```

### `GET /api/users`

Returns a page of user records plus pagination metadata.

```
GET /api/users?q=an&nationalities=American&sort=age&order=desc&limit=3
```

```json
{
  "items": [
    {
      "id": 34808,
      "avatar": "https://avatars.githubusercontent.com/u/88302762",
      "first_name": "Angie",
      "last_name": "Torphy-Stark",
      "age": 72,
      "nationality": "American",
      "hobbies": ["Model Building", "Photography", "Podcasting", "Surfing"]
    },
    {
      "id": 43574,
      "avatar": "https://avatars.githubusercontent.com/u/17926261",
      "first_name": "Angel",
      "last_name": "Lebsack",
      "age": 71,
      "nationality": "American",
      "hobbies": ["Board Games", "Golf", "Table Tennis"]
    },
    {
      "id": 37770,
      "avatar": "https://avatars.githubusercontent.com/u/18019346",
      "first_name": "Angela",
      "last_name": "Borer",
      "age": 68,
      "nationality": "American",
      "hobbies": ["Embroidery", "Swimming", "Volunteering"]
    }
  ],
  "pageInfo": { "hasMore": true, "nextCursor": "eyJ2Ijo2OCwiaWQiOjM3NzcwfQ" }
}
```

Pass `nextCursor` back as `cursor` to fetch the following page; `hasMore: false` and `nextCursor: null` mark the last page.

### `GET /api/facets`

Returns the total matching the current filters, plus the top 20 hobbies and top 20 nationalities among those results, each with a count.

```
GET /api/facets?q=an&nationalities=American&hobbies=Reading
```

```json
{
  "total": 1,
  "hobbies": [
    { "value": "Dancing", "count": 1 },
    { "value": "Embroidery", "count": 1 },
    { "value": "Jewelry Making", "count": 1 },
    { "value": "Journaling", "count": 1 },
    { "value": "Judo", "count": 1 },
    { "value": "Model Building", "count": 1 },
    { "value": "Reading", "count": 1 },
    { "value": "Running", "count": 1 },
    { "value": "Surfing", "count": 1 }
  ],
  "nationalities": [{ "value": "American", "count": 1 }]
}
```

This example is deliberately narrow (one matching user) to show a case mentioned under [Facet counting](#facet-counting) below: once a filter is the only thing distinguishing the result set, its own facet group collapses to a single row.

## Design decisions

### Keyset pagination over offset

The exercise requires no duplicate and no missing users across pages under any sort. With thousands of rows sharing the same `age` or `nationality`, an `OFFSET`-based page window can shift near a page boundary — a row that was at the edge of one page can slide into the next as the underlying order is only weakly determined by ties. A cursor over `(sort_field, id)` doesn't have this problem: each page's `WHERE` clause is `(sort_field, id) > (last_value, last_id)`, so a row is either strictly before or strictly after the cursor, never both and never neither.

This was verified directly rather than assumed: against the real 50,000-row seeded database, walking every page (limit 500) for all eight sort-field/direction combinations and concatenating the ids returned exactly the 50,000 ids of the equivalent unpaginated, fully-ordered query — no duplicates, nothing missing, same order — for every combination.

### Normalized hobbies

Hobbies live in their own table (`hobbies`) with a join table (`user_hobbies`), not as a JSON array column on `users`. "User has all of the selected hobbies" then becomes:

```sql
SELECT uh.user_id FROM user_hobbies uh
JOIN hobbies h ON h.id = uh.hobby_id
WHERE h.name IN (...)
GROUP BY uh.user_id
HAVING COUNT(*) = :hobbyCount
```

which is indexed on `user_hobbies(hobby_id, user_id)`. A JSON column would need one unindexed `LIKE` per selected hobby (`hobbies LIKE '%"Reading"%' AND hobbies LIKE '%"Chess"%' ...`), each a full scan.

### Prefix search and `COLLATE NOCASE`

The name search binds the user's input as `'<term>%'` (escaping any literal `%`, `_`, or `\` the user typed) and matches with `first_name LIKE :q ESCAPE '\'` (and the same for `last_name`, `OR`'d together). The wildcard is trailing, not leading: a fixed prefix followed by `%` keeps the pattern usable as an index range scan; a pattern starting with `%` doesn't, and SQLite falls back to scanning the whole table on every keystroke.

`first_name`, `last_name`, and `nationality` are declared `COLLATE NOCASE` in the schema. SQLite's `LIKE` is already case-insensitive for ASCII regardless of column collation — but turning `LIKE 'term%'` into an indexed range scan is a separate optimization, and SQLite only applies it when the column's collation agrees with that case-insensitivity: a `NOCASE` column, specifically, is what it requires (the default `BINARY` collation doesn't qualify). Without `COLLATE NOCASE`, the comparison would still be case-insensitive, just no longer index-backed — the optimizer silently falls back to a scan.

Confirmed with `EXPLAIN QUERY PLAN` against the real database, through the project's own driver:

```
$ node -e "
  const db = require('better-sqlite3')('server/data/presight.db');
  console.log(db.prepare(\"EXPLAIN QUERY PLAN SELECT * FROM users WHERE first_name LIKE 'an%'\").all());
  console.log(db.prepare(\"EXPLAIN QUERY PLAN SELECT * FROM users WHERE first_name LIKE '%an%'\").all());
"
[
  {
    id: 3,
    parent: 0,
    notused: 164,
    detail: 'SEARCH users USING INDEX idx_users_first_name (first_name>? AND first_name<?)'
  }
]
[ { id: 2, parent: 0, notused: 216, detail: 'SCAN users' } ]
```

### Two endpoints rather than one

`/api/users` and `/api/facets` are separate calls. The client's infinite scroll re-requests `/api/users` for every page, but `/api/facets` only needs to change when the filters themselves change — recomputing the top-20 lists on every scroll tick would be wasted work for numbers that aren't moving. Both endpoints read the same URL-encoded filter state (`q`, `nationalities`, `hobbies`), so there's no separate client-side copy of "what's currently filtered" that the two requests could disagree about.

### Facet counting

Facet counts reflect the fully filtered result set, per the exercise's requirement, not the whole dataset. One consequence: once nationality is the only thing narrowing the results (e.g. a single hobby plus one nationality selected), the nationality facet list collapses to the one selected value — there's nothing left to offer as an alternative. Because a collapsed facet list can no longer be used to remove that filter, a row of removable filter chips (`ActiveFilters`) sits above the results list at all times, independent of what the sidebar currently shows, so every active filter stays removable no matter how narrow the result set gets.

## Known limitations

- `COLLATE NOCASE` folds ASCII case only; it does not case-fold accented or non-Latin characters.
- Text search matches name **prefixes**, not substrings — searching "ohn" will not find "John".
- Avatar images are URLs on an external host (`avatars.githubusercontent.com`); without network access to that host, the UI falls back to rendering initials instead.
