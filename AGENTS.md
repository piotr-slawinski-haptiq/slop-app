# AGENTS.md

## Cursor Cloud specific instructions

### Overview

SLOP (Shopping List Ordering Platform) is a greenfield TanStack Start app with Drizzle ORM on PostgreSQL. See `slop-app-plan.md` for the full product spec and `README.md` for standard commands.

### Services

| Service | How to start | Port |
|---------|-------------|------|
| PostgreSQL | `sudo pg_ctlcluster 16 main start` | 5432 |
| TanStack Start dev server | `bun run dev` | 3000 |

### Key commands

Standard dev commands are in `package.json` scripts:

- **Dev server**: `bun run dev` (Vite on port 3000)
- **Lint**: `bun run lint` (ESLint)
- **Format check**: `bun run format` (Prettier)
- **Test**: `bun run test` (Vitest)
- **Build**: `bun run build` (Vite production build)
- **DB generate**: `bun run db:generate` (Drizzle Kit)
- **DB migrate**: `bun run db:migrate` (Drizzle Kit)
- **DB push**: `bun run db:push` (Drizzle Kit)

### Non-obvious caveats

- **PostgreSQL must be started manually** before running the dev server or DB commands. It does not auto-start. Use `sudo pg_ctlcluster 16 main start`.
- **Bun path**: Bun is installed at `~/.bun/bin/bun`. If `bun` is not found, run `export PATH="$HOME/.bun/bin:$PATH"` or `source ~/.bashrc`.
- **Database credentials**: The local dev database is `slop` owned by user `slop` with password `slop`. The connection string in `.env.local` is `postgresql://slop:slop@localhost:5432/slop`.
- **`.env.local` is not committed** (in `.gitignore`). If it's missing, create it with `DATABASE_URL="postgresql://slop:slop@localhost:5432/slop"`.
- **Drizzle migrations**: After schema changes in `src/db/schema.ts`, run `bun run db:generate` then `bun run db:migrate` to apply them.
- **Tailwind CSS** is included by the scaffold. The project plan calls for CSS Modules; future work will migrate styling.
- **The `src/routeTree.gen.ts` file is auto-generated** by TanStack Router. Do not edit manually; it regenerates when the dev server runs or on build.
