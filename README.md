# SLOP (Shopping List Ordering Platform) MVP

SLOP is a TanStack Start + Bun + PostgreSQL app for a single shared office shopping list.

It implements:

- Magic-link auth with session cookies (`@haptiq.com` allowlist)
- Roles: `orderer` and `colleague`
- Catalog (items with `is_evergreen`)
- Shared request list (idempotent add, cancel)
- Fulfillment threshold (`min_pending_items`)
- Fulfill flow (creates fulfillment record with `fulfilled_at`, clears list)
- In-app notifications for orderers (immediate + threshold)
- Orderer admin area (catalog, threshold, fulfillment history)

## Tech stack

- **Full-stack:** TanStack Start (file routes, loaders, server functions)
- **Runtime:** Bun
- **Database:** PostgreSQL + Drizzle ORM/migrations
- **Styling:** CSS Modules + tokenized design constants

## Prerequisites

- Bun
- PostgreSQL (running and reachable)

## Cursor cloud environment defaults

Repo-level cloud agent defaults live in:

- `.cursor/environment.json`
- `.cursor/cloud/install.sh`
- `.cursor/cloud/start.sh`

These preinstall Bun, Drizzle workflow prerequisites, and project dependencies
so background/cloud agents can run `bun install`, `bun run build`, and
`bun test` without manual bootstrap.

## Environment variables

Copy `.env.example` to `.env.local` and set values:

```bash
cp .env.example .env.local
```

Required:

- `DATABASE_URL`
- `ALLOWED_EMAIL_DOMAIN` (default: `haptiq.com`)
- `MAGIC_LINK_SECRET`

Recommended:

- `APP_URL` (default: `http://localhost:3000`)
- `ORDERER_EMAILS` (comma-separated seed orderers)
- `SESSION_COOKIE_NAME`
- `SESSION_DURATION_DAYS`
- `MAGIC_LINK_DURATION_MINUTES`

Email transport:

- `SMTP_URL` + `EMAIL_FROM` to send real magic-link emails
- If these are not set, the magic link is logged to server output and shown in dev UI

## Install and run

```bash
bun install
bun run db:migrate
bun run dev
```

App runs at `http://localhost:3000`.

## Database & migrations

Schema is defined in `src/db/schema.ts`.

Migration commands:

```bash
bun run db:generate
bun run db:migrate
```

## Tests

Run:

```bash
bun test
```

Current tests cover key invariants:

- auth domain rejection + sign-in session creation
- idempotent add request
- cancel request behavior
- fulfill clears list + creates fulfillment
- role checks (colleague cannot fulfill)

## Role behavior

- First signed-in user becomes `orderer` unless `ORDERER_EMAILS` is configured.
- Users in `ORDERER_EMAILS` are always seeded as `orderer`.
- Others default to `colleague`.
