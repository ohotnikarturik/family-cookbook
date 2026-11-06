# @family-cookbook/web

Next.js App Router app for Family Cookbook.

## Development

From the monorepo root:

```bash
pnpm dev:web
```

The dev server listens on **http://localhost:3003** (see `package.json` scripts).

## Build

```bash
pnpm --filter @family-cookbook/web build
pnpm --filter @family-cookbook/web start
```

Production `start` uses the same port **3003**. To use another port, run `next start -p <port>` or set `PORT`.
