# Context

A read-only **user directory**: a React client over a Node API over SQLite, offering text search, multi-select hobby and nationality filters, sorting, infinite virtualized scroll, URL-synced view state, and top-20 facet counts that reflect the active filter state.

The full exercise brief is in `README.md`. Decisions are charted on the wayfinder map, [#2](https://github.com/FikiratJavadov/presight-execise/issues/2).

## Glossary

Use these terms verbatim in issue titles, test names, module names, and code. Where a term has a tempting synonym the project avoids, that is called out.

### User

A person in the directory. Has `id`, `first_name`, `last_name`, `age`, `nationality`, `avatar`, and 0–10 hobbies. Read-only — there is no write path anywhere in the system.

### Hobby

A free-text interest, stored as a row in `user_hobbies` rather than as a normalised dimension. A user has **0 to 10** of them. Both extremes exist in the seeded data on purpose: 0-hobby users exercise the empty card, 10-hobby users exercise the `+n` overflow.

### Nationality

A single value per user, stored as a **display name** ("Germany"), not an ISO code. One column on `users`.

### Selection

The set of values the viewer has currently picked in one dimension — e.g. `hobbies=[chess, math]`. Distinct from a **facet**, which is what the sidebar offers. Do not call a selection a "filter"; a filter is the whole predicate.

### Result set

The users matching the complete predicate — text, nationalities, and hobbies applied together. Written `|result|` when the count is meant.

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

The lowercased, diacritic-stripped form of a name, stored in `users.search_name` and produced by the shared `normalizeSearchText()` module. Applied at **both** seed time and query time — the same function, so the two cannot drift.

Exists because SQLite's `LIKE` and `COLLATE NOCASE` fold ASCII only. It makes `"ozcan"` match Özcan and `"BJORN"` match Bjørn. Not to be confused with database normalisation, which this project deliberately does *not* apply to hobbies.

### Seed

The generated dataset and the script that produces it (`server/src/db/seed.ts`). **Self-sufficient and truncating**: it migrates, clears, inserts, and `ANALYZE`s in one transaction, so it is safe to run repeatedly and always yields the identical dataset. "Seed" also names the per-user string handed to the avatar and name generators — disambiguate as *seed script* or *seed value* where it matters.

## Conventions

- **pnpm everywhere**, no exceptions.
- Sorted results are deterministic, with `id` as the final tie-breaker **following the sort direction** (`last_name DESC, id DESC`) so a single index serves both directions.
- Facet ordering is likewise deterministic: `count DESC, value ASC`.
