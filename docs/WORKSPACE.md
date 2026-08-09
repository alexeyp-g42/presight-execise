# Workspace structure

How the three packages fit together, and why the server is the odd one out.

## Layout

```
apps/
  schema/   @presight/schema  zod schemas + inferred types, shared by client and server
  server/   @presight/server  Express API over SQLite
  client/   @presight/client  React + Vite front end
```

`@presight/schema` is the contract between the other two. Both the API's responses and the
client's parsing of them come from the same zod schemas, so the wire format cannot drift from the
types without something failing loudly.

Consumers resolve it through a live symlink to `apps/schema`, so a rebuild is picked up
immediately — but `dist/` has to exist and be current. After changing anything in `apps/schema`,
rebuild it, or the other two keep compiling against the previous output:

```bash
pnpm --filter=@presight/schema build
```

nx does this for you when you build through it (`build.dependsOn: ["^build"]`).

## Why the server never builds

Node 26 strips TypeScript types natively, so `apps/server` runs its source directly —
`node src/index.ts` in development, and the same command inside the container. There is nothing to
transpile, so the package has no `build` script and `pnpm -r build` covers only schema and client.
The Docker image ships the `.ts` files via `pnpm deploy --prod`.

`apps/server/build.js` and the `esbuild` devDependency are leftovers from the removed step and can
go.

---

Per-package scripts live in the [README](../README.md#scripts); running the apps from source is in
[DEVELOPMENT.md](DEVELOPMENT.md).
