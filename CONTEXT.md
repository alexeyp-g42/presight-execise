# Context

A read-only **user directory**: a React client over a Node API over SQLite, offering text search, multi-select hobby and nationality filters, sorting, infinite virtualized scroll, URL-synced view state, and top-20 facet counts that reflect the active filter state.

The full exercise brief is in `docs/brief.md`, and `README.md` is how a reviewer runs it. Decisions are charted on the wayfinder map, [#2](https://github.com/FikiratJavadov/presight-execise/issues/2).

## Glossary

Use these terms verbatim in issue titles, test names, module names, and code. Where a term has a tempting synonym the project avoids, that is called out.

### User

A person in the directory. Has `id`, `first_name`, `last_name`, `age`, `nationality`, `avatar`, and 0–10 hobbies. Read-only — there is no write path anywhere in the system.

### Hobby

A free-text interest, stored as a row in `user_hobbies` rather than as a normalised dimension. A user has **0 to 10** of them. Both extremes exist in the seeded data on purpose: 0-hobby users exercise the empty card, 10-hobby users exercise the `+n` overflow.

### Nationality

A single value per user, stored as a **display name** ("Germany"), not an ISO code. One column on `users`.

### Avatar

A DiceBear SVG **drawn on demand from the user id**, served by `GET /api/avatars/<id>.svg` and cached for a year as `immutable`. Not a column: the id is the generator's seed, so the value the API returns is the id in a URL and the route answers without touching a table — including before the seed script has run.

Offline by construction, which is the point — the reviewer runs this from compose, and every rejected alternative failed there first (`faker.image.avatar()` returns a remote URL; data URIs put ~50KB of avatar on every page; a static set has 25,000 users sharing a couple of hundred faces).

The route is the **one exception to the error envelope**, and only on success: it returns SVG rather than JSON. A path that names no avatar — anything but a run of digits — is an ordinary `NOT_FOUND`.

### Selection

The set of values the viewer has currently picked in one dimension — e.g. `hobbies=[chess, math]`. Distinct from a **facet**, which is what the sidebar offers. Do not call a selection a "filter"; a filter is the whole predicate.

### Result set

The users matching the complete predicate — text, nationalities, and hobbies applied together. Written `|result|` when the count is meant.

Its size travels as **`total`** on the facets endpoint and nowhere else. It depends on exactly the filter params, costs one `COUNT(*)` in a handler already running two aggregates over the same predicate, and so never recomputes while the viewer scrolls. It is the second number in "Showing 50 of 1,234"; the list endpoint answers a page and deliberately cannot say what stands behind it.

### ALL-of / ANY-of

The two filter semantics, and the reason facet behaviour is asymmetric.

- **Hobbies are ALL-of**: a user must have *every* selected hobby. Selecting more **narrows**. Implemented as `HAVING COUNT(DISTINCT hobby) = ?`.
- **Nationalities are ANY-of**: a user must have *one* of the selected nationalities. Selecting more **widens**. Implemented as `IN (...)`.

Prefer "ALL-of" and "ANY-of" over "AND"/"OR", which get confused with SQL boolean operators in the same sentence.

### Facet

A dimension the sidebar offers for filtering, returned as `{ value, count }` entries ordered by `count DESC, value ASC`. There are two: hobbies and nationalities.

The governing rule — **a facet count must predict what happens when you click it** — resolves oppositely per dimension:

| Facet | Own selection | Reads as |
|---|---|---|
| Hobbies | **kept** in the predicate | "adding this narrows you to *count*" |
| Nationalities | **dropped** from the predicate | "adding this brings in *count* more" |

Call this the **asymmetric facet rule**. Avoid "faceted search defaults" as a shorthand — the classic default (exclude own dimension everywhere) is wrong for the ALL-of side.

### Pinned value

A selected value included in a facet response despite not making the top 20, carrying its **true count, 0 when it contributes nothing**. Exists so a selection can always be deselected — a rare nationality can rank below 20, and an empty result set makes even a selected hobby vanish from its own facet.

A facet array is therefore `20 + k` entries long, where *k* is the number of pinned values.

### Normalised search text

The lowercased, diacritic-stripped form of a name, stored in `users.search_name` and produced by the shared `normalizeSearchText()` module (`server/src/search/normalize-search-text.ts`). Applied at **both** seed time and query time — the same function, so the two cannot drift.

Exists because SQLite's `LIKE` and `COLLATE NOCASE` fold ASCII only. It makes `"ozcan"` match Özcan and `"BJORN"` match Bjørn. Not to be confused with database normalisation, which this project deliberately does *not* apply to hobbies.

NFD plus a diacritic strip does most of the work. The rest is an explicit **fold map** for characters NFD leaves untouched: letters that are a single indivisible code point rather than a base plus a combining mark (`ø ł đ ß æ ı ə ɔ ε`), and the typographic quotes that stand in for an apostrophe (`‘ ’`). The bar for adding an entry is that a seeded locale actually produces the character — anything else is upstream noise, and the seed redraws the name rather than storing it.

### Seed

The generated dataset and the script that produces it (`server/src/db/seed.ts`). **Self-sufficient and truncating**: it migrates, then clears, inserts and `ANALYZE`s in one transaction, so it is safe to run repeatedly and always yields the identical dataset. (Migration sits just outside that transaction because Drizzle's migrator issues its own `BEGIN`/`COMMIT` and SQLite has no nested transactions; it is atomic and idempotent on its own.) 25,000 users by default, overridable with `SEED_USER_COUNT`.

Both vocabularies — 80 hobbies, 50 nationalities — are **Zipf-weighted by list order**, so a top-20 is a genuine truncation of a long tail and the counts stay meaningful after selections stack. Names are drawn per nationality from that nationality's own faker locale, **Latin script only**: a name in a script the viewer cannot type is a row search can never reach.

"Seed" also names the per-user string handed to the avatar and name generators — disambiguate as *seed script* or *seed value* where it matters.

### Cursor

The opaque base64url token that advances pagination, encoding `{ sort, dir, value, id }` — where `value` is the row's value in the active sort field. Returned as `page_info.next_cursor`, `null` on the last page.

It carries the `sort` and `dir` it was **minted under**, so a cursor replayed against a different sort is rejected with `CURSOR_SORT_MISMATCH` rather than silently returning wrong rows. Never appears in the shared URL — only the filters and sort round-trip there, so a reload always restarts from the first page.

Say *cursor*, not "page" or "offset"; there is no page number anywhere in the system.

### Limit

How many users one request may return: an integer 1–100, defaulting to 50. Out of range is a **400, never a clamp** — clamping is a silent correction the client cannot observe, and it would split the "invalid input is a 400" rule into "some invalid input errors, some is quietly fixed".

Unlike `sort` and `dir`, it lives in the server rather than in the contract package, and for the reason those two live there: a default belongs to the contract when the *client* has to apply it unprompted — which it does for a hand-edited `?sort=nickname`, and never does for `limit`, since `limit` no more round-trips through the shared URL than the cursor does. What the client sends it chooses; what the server accepts it validates. Should the client ever need to know the ceiling to pick a page size, that is the moment to publish it, not before.

### Shared URL

The client's whole view state, in the query string: search text, sort field, sort direction, and both selections. Written **in exactly the shape the API accepts** (`q`, `sort`, `dir`, repeated `hobbies` / `nationalities` keys), so there is no translation layer between the address bar and the request, and pasting the URL to a colleague hands them the view rather than a description of it.

Held by nuqs, running **router-free**: the app has zero routes, so the adapter reads and writes `window.location` directly. `sort` and `dir` are parsed against the contract package's arrays **at the client boundary**, so a hand-edited `?sort=nickname` falls back to `DEFAULT_SORT` client-side and never reaches the API.

What is *not* in it is as deliberate: the cursor and the limit never round-trip, so a reload always restarts from the first page.

Say *shared URL* rather than "route" or "deep link" — there is no router and no route to link into.

### Search draft

The search box's local, ephemeral copy of what the viewer is typing, ahead of the **search text** — which is the URL's value and the only thing the list is keyed on.

The distinction is the point. The draft paints on the keystroke, so the input never feels sticky; the search text changes 300ms later, when the client's **one timer** writes the URL. One timer, at that boundary, debounces the address bar and the fetch together — which is what makes *the URL always describes what is on screen* an invariant rather than a hope. A second timer anywhere in the client is a regression, not an optimisation.

The draft flows from the search text on mount and when the URL moves on its own (the back button, a pasted link); it never flows the other way except through that timer — trimmed on the way, because the API module drops blank `q` and a URL reading `?q=+++` would advertise a filter no request carries.

### Contract package

`@presight/shared` in `packages/shared` — the single source for the API's const arrays (`SORT_FIELDS`, `SORT_DIRS`), the defaults those arrays are read against (`DEFAULT_SORT`, `DEFAULT_DIR`), and the response types, imported by both client and server as **`.ts` source with no build step**.

Defaults live here because they are contract, not implementation detail: the client parses a hand-edited `?sort=nickname` against the arrays and falls back without a request, and the server applies the same pair when the params are absent — so the two cannot disagree about what "no sort" means.

Deliberately carries **no runtime dependency**: the server derives `z.enum(SORT_FIELDS)` from it, so Zod never reaches the client bundle. It works under Node's native type stripping only because pnpm symlinks it to a realpath outside `node_modules` — which is why **`pnpm deploy --legacy` is prohibited** and the Docker runtime stage must copy `packages/shared` alongside `server/node_modules`.

### Feature

A vertical slice under `src/feature/`, owning whichever of `api/ components/ queries/ hooks/ schemas/ lib/ db/` it actually needs — and importing no sibling, per the Conventions below.

Four on the client (`user`, `facet-filter`, `search`, `sort`) and three on the server (`user`, `avatar`, `health`). What earns the name is having a consumer that would notice if the slice vanished, not size: `sort` is one component, and `health` is one handler that the container's healthcheck depends on. What does *not* earn it is machinery every feature leans on — `open-db`, the error envelope, `serve-client` — which is `shared/` however much code it is.

`feature/*/api/` means the fetch layer on the client and the Express handlers on the server. There are no route handlers or server actions in the Next.js sense; the reference this layout is drawn from is translated, not adopted.

## Conventions

- **pnpm everywhere**, no exceptions.
- **The wire format is `snake_case` throughout**, envelope keys included (`page_info`, `has_more`, `next_cursor`) — matching the brief's own `first_name` / `sort=first_name`, so there is no mapping layer between column, JSON field, and sort value.
- **Invalid input is a 400, never a silent correction** — including unrecognized query keys. The one exception is a selection matching nothing, which is a `200` with an empty result set, because the pinned-value rule requires it.
- Sorted results are deterministic, with `id` as the final tie-breaker **following the sort direction** (`last_name DESC, id DESC`) so a single index serves both directions.
- Facet ordering is likewise deterministic: `count DESC, value ASC`.
- **A file is named after the symbol it exports.** On the server that reads as kebab-case (`user-filter-params.ts` exports `userFilterParamsSchema`); on the client it reads as `UserDirectoryCard.tsx` and `useVirtualUserRows.ts`, because React's own casing for a component and a hook is not negotiable. The two look different and follow one rule — which is the point, since the alternative is a component file whose name matches nothing inside it.

  A factory prefix or a kind suffix is **elided**, as `user-filter-params.ts` already drops the `Schema`: `list-users-handler.ts` exports `createListUsersHandler`. What survives the elision is the concept, and it is what both directions are predictable from — you can name the file from the symbol and the symbol from the file. This is deliberately *not* the FDA reference's `apiUser.ts`, which is derivable from neither.

- **A feature imports only its own subtree, `src/shared/`, `@presight/shared`, and npm.** Never a sibling feature. Anything two features need is **promoted to `src/shared/`** — that promotion is the entire mechanism, and there is no second one. Only the composition root reaches into features: `app/` on the client, `app.ts` on the server. `src/shared/` is a **leaf** and may not import a feature, which is the cycle the layout exists to prevent.

  Enforced, not merely agreed: each `eslint.config.js` generates one `no-restricted-imports` block per feature from a single array of feature names, so adding a feature is a one-line edit rather than an edit to every sibling. CI runs `pnpm lint`, so a sibling import fails the build rather than a review.

  The rule decides placement questions that would otherwise be taste. A module used by three features is `shared/` by arithmetic; a module used by one stays put. Where a component reads data from two features — `DirectoryResultCount` takes `shownCount` from the user list and `total` from the facets response — it belongs to neither and is `shared/`, not the composition root, because a feature depending upward on `app/` is the same cycle by another route.

- **No barrel files.** A feature exposes no `index.ts`; importers name the module they want. Three reasons, and any one would do: Vite's performance guide advises against them, since importing one API from a barrel fetches and transforms every file behind it; the server's `nodenext` resolution has no directory-index lookup, so every barrel import would have to be written `../user/index.ts` — longer than the direct import it replaces; and under the import rule above a feature barrel would have exactly one caller, the composition root. The "banned deep imports" a barrel buys are already bought, more cheaply, by banning the sibling outright.

- **Three tiers are called "shared", and they are not the same thing.** `@presight/shared` is the [contract package](#contract-package) — *cross-process*, imported by two independent builds, and it stays a workspace package for the reason that section gives. `client/src/shared/` and `server/src/shared/` are *cross-feature within one process*, and never cross the client/server line. The overload is accepted deliberately: renaming the package would touch every import in both trees to disambiguate a word whose two meanings are already told apart by whether the specifier is bare.
