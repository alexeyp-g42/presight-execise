# Presight user directory

A read-only directory of 25,000 people: search by name, narrow by hobby and nationality, sort, and scroll one virtualized list that pages as you go. The sidebar's top-20 counts follow the filter state rather than the whole dataset, and the whole view lives in the URL — paste the link and you hand over the view, not a description of it.

React 19 + Vite client · Express 5 API · SQLite via Drizzle and better-sqlite3 · pnpm workspace · one image, one origin, one port.

The original exercise brief is [`docs/brief.md`](docs/brief.md). The vocabulary and the reasoning behind each decision are in [`CONTEXT.md`](CONTEXT.md).

## Run it with Docker

```sh
docker compose up --build
```

Then open **http://localhost:3000**. The API is under `/api` and the client is served from the same origin, so there is no second port, no API URL to configure and no CORS.

| Command | What it does |
| --- | --- |
| `docker compose up --build` | Builds the image, seeds 25,000 users into the `db-data` volume, serves on `:3000`. The build is the slow part — a minute or two on a first run, seconds after; the seed itself takes about a second. |
| `docker compose down` | Stops and removes the container. **The volume stays**, so the data does. |
| `docker compose up` | Boots against that same data: no rebuild, no reseed, healthy in ~3s. The log says `database present … skipping seed`. |
| `docker compose down -v` | Stops it and **deletes the volume**. The next `up` seeds from scratch. |

Seeding is decided before anything opens the database, by `SEED_ON_BOOT` in `docker-compose.yml`: `auto` (the default — seed only when the database file is missing), `force` (drop it and reseed on every boot), or `never`. Anything else is a failed boot rather than a silent fallback.

## Run it on the host

Node 24 (`.nvmrc`) and pnpm 11.

```sh
pnpm install
pnpm seed   # writes data/presight.sqlite — 25,000 users, ~4s
pnpm dev    # API on :3000, client on :5173
```

Then open **http://localhost:5173**. Vite proxies `/api` to the API, so the client's base URL is the literal string `/api` here too and no code branches on the environment.

`pnpm seed` truncates and rewrites: run it as often as you like, and you get the identical directory back rather than a second copy of it. `SEED_USER_COUNT` overrides the 25,000, and `DATABASE_PATH` overrides where the file goes.

## Smoke it by hand — five checks

There is no end-to-end layer (see below), so this is the pass. It takes about a minute, and the numbers below are exact: the seed is deterministic, so a fresh one gives you these counts too.

1. **Filter.** Type `an` in the search box — "Showing 50 of 7,628". Click **chess** under Hobbies (→ 537), then **Germany** under Nationalities (→ 30). The list, both facet lists and the count all move together. Notice the hobby counts collapse toward the result set while the nationality counts stay far larger — that asymmetry is the requirement, not a bug; see below.
2. **Scroll past three cursors.** Click those two chips again to deselect them, keep `an`, and scroll past ~150 rows — the limit is 50 users a request, so that is three cursors spent. Rows keep arriving with no gap and no repeat, and "Showing …" climbs 50 at a time. Leave the elements panel open while you do it: the list holds a dozen or so rows however far down you get.
3. **Copy the URL.** It reads `?q=an&hobbies=chess&nationalities=Germany` — the query the API itself takes, repeated keys and all, with no cursor in it.
4. **Reload it**, or paste it into a new tab. Same text, same chips, same sort, same counts — and the list restarts at the top, because the cursor deliberately never round-trips.
5. **Sort.** Set **Sort by** to Age and the direction to Descending. The list reorders and starts again from the first cursor, oldest first; the sidebar counts do not move at all, because the sort is not part of the predicate.

Then narrow the window under 1024px and repeat step 1. The sidebar leaves the flow, the same chips arrive from a **Filters** button badged with the number of values selected, and the drawer is a real `<dialog>`: Escape closes it and focus returns to the button.

## Deliberate omissions

**`search_name` is unindexed on purpose.** The text filter is `LIKE '%q%'`, and a leading wildcard cannot use a B-tree under any strategy — an index on the column would be built, maintained and then ignored by the planner. At 25,000 rows the scan is ~3ms, so the real alternative is not "index or scan" but FTS5: a shadow copy of every name, triggers to keep it in step, and token-prefix matching in place of the substring match the brief asks for. The column carries the lowercased, diacritic-stripped form instead, written by the seed and matched at query time through the same function, so `ozcan` finds Özcan.

**The two facets behave differently, and that is the requirement.** A facet count has to predict what happens when you click it, and the two dimensions resolve that oppositely:

| Facet | Semantics | Own selection | A count reads as |
| --- | --- | --- | --- |
| Hobbies | ALL-of — a user needs every selected hobby, so selecting more narrows | **kept** in the predicate | "clicking this narrows you to *count*" |
| Nationalities | ANY-of — a user needs one of them, so selecting more widens | **dropped** from the predicate | "clicking this brings in *count* more" |

Doing the same thing on both sides is wrong on one of them: keep the nationality selection and no unselected nationality can ever appear, so the sidebar dead-ends; drop the hobby selection and it advertises `hiking 120` when clicking hiking leaves you 5. A selected value is always offered back with its true count — 0 included — so a selection can never strand itself.

**No coverage gate.** A threshold gates the number rather than the testing, and the cheapest way to clear one is never the most useful test to write. `pnpm test:coverage` prints the figure when you want to look at it; CI runs lint, typecheck, tests and both builds, plus a compose job that boots the image twice to prove the second boot reuses the volume.

**No end-to-end layer.** The two things only a real browser can assert — virtualization and infinite scroll — are also the flakiest things to assert in CI, and they would cost a browser download, a web-server config that boots the API, and a seeded fixture database to get there. A red run from a scroll-position race reads worse than no e2e at all, so the five checks above are the deliberate replacement.

**Scope.** A read-only directory: no auth, no sessions, no write path. Every endpoint is a `GET`, nothing in the app mutates a row, and the only state that outlives a request is the seeded database.

## Where things are

| | |
| --- | --- |
| `client/` | React app. `src/user-directory/` is the whole feature; `src/api/` is the only module that talks to the API. |
| `server/` | Express API. `src/routes/` is the HTTP surface over `src/users/`, `src/avatars/` and `src/db/`; `src/db/seed.ts` is the seed. |
| `packages/shared/` | `@presight/shared` — the contract both sides import: sort fields, defaults, response types. |
| `docker/entrypoint.sh` | The container's boot sequence, and the whole of "first `up` seeds, second `up` is instant". |

`GET /api/users` pages the directory, `GET /api/facets` returns both top-20s plus the result-set total, `GET /api/avatars/<id>.svg` draws an avatar from the id, and `GET /api/health` is what the container's healthcheck asks.

## Other commands

| Command | |
| --- | --- |
| `pnpm test` | The whole suite, client and server. |
| `pnpm test:coverage` | The same, with a coverage report. |
| `pnpm lint` / `pnpm typecheck` | Per package, fanned out from the root. |
| `pnpm build` | Both builds — the server to `server/dist`, the client to `client/dist`. |
