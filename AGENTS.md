# AGENTS.md — SLOP (Shopping List Ordering Platform)

## Project Overview

SLOP is a single shared office shopping list app. Colleagues add items they need; when the list reaches a configurable threshold (or an evergreen/staple item is added), the orderer is notified and fulfills the order. After fulfillment the list clears and a new cycle begins.

**Production plan:** `slop-app-plan.md` at the repo root.

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Full-stack framework | TanStack Start | File-based routing, server functions, SSR via Vinxi |
| UI | React 19 | JSX components with CSS Modules |
| Styling | CSS Modules | Colocated `*.module.css` files, design tokens in `src/styles/tokens.module.css` |
| Runtime | Bun | Package manager, test runner, script runner |
| Database | PostgreSQL | Drizzle ORM for schema, queries, and migrations |
| Auth | Magic link + session cookies | `@haptiq.com` domain allowlist only |

## Directory Structure

```
/workspace
├── AGENTS.md                    # This file
├── slop-app-plan.md             # Product and technical plan
├── package.json                 # Dependencies, scripts
├── tsconfig.json                # TypeScript config (strict, path aliases)
├── vite.config.ts               # Vite + TanStack Start + React plugins
├── drizzle.config.ts            # Drizzle ORM config (reads DATABASE_URL)
├── .env.example                 # Environment variable template
├── .env.local                   # Local env overrides (gitignored)
│
├── drizzle/                     # Generated migration SQL files
│   └── 0000_stormy_wasp.sql     # Initial migration
│
├── src/
│   ├── styles.css               # Global reset and base typography
│   ├── styles/
│   │   └── tokens.module.css    # Design tokens (colors, spacing, radii, shadows)
│   │
│   ├── db/
│   │   ├── schema.ts            # Drizzle schema (all tables, enums, indexes)
│   │   └── index.ts             # DB connection pool + Drizzle instance
│   │
│   ├── lib/
│   │   ├── env.ts               # Centralized env access with defaults
│   │   ├── security.ts          # Token generation (crypto.randomBytes) and HMAC hashing
│   │   ├── http-error.ts        # HttpError class for status-code-aware errors
│   │   │
│   │   ├── auth/
│   │   │   ├── types.ts         # SessionUser type
│   │   │   ├── magic-link.server.ts  # requestMagicLink, verifyMagicLink
│   │   │   └── session.server.ts     # Session CRUD, cookie management, requireSessionUser
│   │   │
│   │   ├── domain/
│   │   │   ├── model.ts         # In-memory domain model (for unit tests)
│   │   │   └── model.test.ts    # Unit tests for domain invariants
│   │   │
│   │   ├── slop/
│   │   │   └── service.server.ts # Core business logic (dashboard, add/cancel request,
│   │   │                         #   fulfill, catalog CRUD, threshold, notifications)
│   │   │
│   │   ├── server-fns/
│   │   │   ├── auth.functions.ts  # TanStack server functions for auth
│   │   │   └── slop.functions.ts  # TanStack server functions for all SLOP operations
│   │   │
│   │   └── integration.test.ts  # Integration tests against real PostgreSQL
│   │
│   ├── routes/
│   │   ├── __root.tsx           # Root layout (HTML shell, devtools, global styles)
│   │   ├── index.tsx            # Dashboard page (/) — protected, main app UI
│   │   ├── index.module.css     # Dashboard page styles
│   │   ├── login.tsx            # Login page (/login) — magic link form
│   │   ├── login.module.css     # Login page styles
│   │   ├── auth.verify.tsx      # Magic link verification (/auth/verify?token=...)
│   │   └── routeTree.gen.ts     # Auto-generated route tree
│   │
│   └── ui/
│       ├── components/
│       │   ├── CentralList.tsx / .module.css    # Main shared order list
│       │   ├── ProductCard.tsx / .module.css     # Draggable product card
│       │   ├── Omnisearch.tsx / .module.css      # Search/create component
│       │   └── NotificationPopover.tsx / .module.css # Orderer notification list
│       │
│       └── elements/
│           ├── Button.tsx / .module.css   # Button (primary, secondary, ghost, danger)
│           └── Input.tsx / .module.css    # Styled input wrapper
│
├── .cursor/
│   ├── environment.json         # Cloud agent env config
│   ├── cloud/
│   │   ├── install.sh           # Cloud agent install script (Bun, deps, PostgreSQL)
│   │   └── start.sh             # Cloud agent start script (Postgres, .env.local)
│   ├── rules/                   # Cursor rules for AI agents
│   │   ├── slop-stack-and-plan.mdc
│   │   ├── slop-domain-and-data.mdc
│   │   ├── slop-auth.mdc
│   │   ├── slop-scope.mdc
│   │   ├── slop-ux-and-ui.mdc
│   │   ├── slop-design-system.mdc
│   │   ├── slop-styling.mdc
│   │   ├── context7-technical.mdc
│   │   └── frontend-screenshot-policy.mdc
│   └── skills/                  # Reusable agent skills (general purpose)
│
└── docs/                        # Additional documentation
```

## Environment Setup

### Prerequisites

- **Bun** (>= 1.x) — runtime, package manager, test runner
- **PostgreSQL** (>= 16) — running and reachable

### Quick Start

```bash
cp .env.example .env.local       # Create local env config
# Edit .env.local: set DATABASE_URL, MAGIC_LINK_SECRET, ORDERER_EMAILS

bun install                      # Install dependencies
bun run db:migrate               # Apply database migrations
bun run dev                      # Start dev server on http://localhost:3000
```

### Cloud Agent Setup

The cloud agent environment is configured via `.cursor/environment.json`, `.cursor/cloud/install.sh`, and `.cursor/cloud/start.sh`. These scripts:

1. Install Bun if missing
2. Install system dependencies (build-essential, postgresql-client)
3. Optionally install/start a local PostgreSQL server (`INSTALL_LOCAL_POSTGRES_SERVER=1`, `START_LOCAL_POSTGRES=1`)
4. Run `bun install`
5. Copy `.env.example` to `.env.local` if missing

After cloud boot, you may need to:
- Start PostgreSQL: `sudo pg_ctlcluster 16 main start`
- Run migrations: `bun run db:migrate`

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `MAGIC_LINK_SECRET` | Yes | `dev-magic-link-secret` | HMAC secret for token hashing |
| `ALLOWED_EMAIL_DOMAIN` | No | `haptiq.com` | Only emails from this domain can sign in |
| `APP_URL` | No | `http://localhost:3000` | Base URL for magic link emails |
| `ORDERER_EMAILS` | No | — | Comma-separated emails that get orderer role |
| `SESSION_COOKIE_NAME` | No | `slop_session` | Name of the session cookie |
| `SESSION_DURATION_DAYS` | No | `30` | Session expiry in days |
| `MAGIC_LINK_DURATION_MINUTES` | No | `15` | Magic link token expiry in minutes |
| `SMTP_URL` | No | — | SMTP transport URL (if empty, magic links log to console) |
| `EMAIL_FROM` | No | — | Sender email for magic links |

## Database

### Schema

Defined in `src/db/schema.ts` using Drizzle ORM. Eight tables:

- **users** — `id`, `email` (unique), `role` (orderer|colleague), `created_at`
- **sessions** — `id` (text), `user_id` (FK), `expires_at`, `created_at`
- **magic_link_tokens** — `id`, `email`, `token_hash` (unique), `expires_at`, `used_at`, `created_at`
- **items** — `id`, `name`, `category`, `is_evergreen`, `created_at` (unique on name+category)
- **requests** — `id`, `item_id` (FK), `requester_id` (FK), `status`, `fulfillment_id` (FK, nullable), `created_at` (unique partial index: one active request per item)
- **fulfillments** — `id`, `trigger` (immediate|threshold), `status` (pending|fulfilled), `fulfilled_at`, `created_at`
- **fulfillment_settings** — `id` (singleton=1), `min_pending_items` (default 5), `updated_at`
- **notifications** — `id`, `user_id` (FK), `type` (immediate|threshold), `message`, `metadata` (jsonb), `read_at`, `created_at`

### Migration Commands

```bash
bun run db:generate   # Generate new migration from schema changes
bun run db:migrate    # Apply pending migrations
bun run db:push       # Push schema directly (dev shortcut)
bun run db:studio     # Open Drizzle Studio GUI
```

## Authentication Flow

1. User enters their `@haptiq.com` email on `/login`
2. Server generates a random token, hashes it (HMAC-SHA256), stores it in `magic_link_tokens`
3. In dev: magic link URL is logged to console and shown on the login page
4. In prod: magic link is emailed via SMTP
5. User clicks the link → `/auth/verify?token=...`
6. Server verifies token hash, checks expiry and usage, creates/finds user
7. First user ever (or any email in `ORDERER_EMAILS`) gets `orderer` role; others get `colleague`
8. Session is created, session cookie is set, user is redirected to `/`

## Domain Invariants

These are enforced in code and DB constraints:

1. **Single shared list** — One current order list (set of pending/in_fulfillment requests without a fulfillment). No tabs or multiple lists.
2. **One instance per product** — At most one active request per `item_id` on the list. Enforced by a unique partial index.
3. **Fulfillment record on clear** — When orderer marks list as fulfilled: creates `Fulfillment` row with server-set `fulfilled_at`, links all current requests to it, sets their status to `fulfilled`. List is now empty.
4. **No inventory** — No stock levels, shelves, or inventory tracking.
5. **No order cycles** — No manual "open/close week". Fulfillment + threshold replace that concept.

## Fulfillment Logic

- **Add request** → item goes on the list (idempotent). If `item.is_evergreen` → notify orderer immediately. Else → if distinct items on list >= `min_pending_items` threshold → notify orderer.
- **Orderer fulfills** → creates Fulfillment with auto `fulfilled_at`, attaches current list requests, sets their status to `fulfilled`; list is empty for the next cycle.

## Roles and Permissions

| Action | Orderer | Colleague |
|--------|---------|-----------|
| View shared list | Yes | Yes |
| Add request to list | Yes | Yes |
| Cancel own/any request | Yes | Yes |
| Search / use omnisearch | Yes | Yes |
| Fulfill (clear) the list | Yes | No |
| Manage catalog (CRUD items) | Yes | No |
| Toggle item evergreen status | Yes | No |
| Update fulfillment threshold | Yes | No |
| View past fulfillments | Yes | No |
| View notifications | Yes | No |

## Key Scripts

```bash
bun run dev           # Start Vite dev server on port 3000
bun run build         # Production build (client + server)
bun run preview       # Preview production build
bun test              # Run all tests (Bun test runner)
bun run db:generate   # Generate Drizzle migrations
bun run db:migrate    # Run Drizzle migrations
bun run db:push       # Push schema to DB (no migration file)
bun run db:studio     # Drizzle Studio (DB browser)
```

## Testing

### Unit Tests

`src/lib/domain/model.test.ts` — Tests domain invariants using an in-memory model:
- Auth domain rejection and session creation
- Idempotent request add / cancel
- Fulfill clears list and creates fulfillment
- Role checks (colleague cannot fulfill)

### Integration Tests

`src/lib/integration.test.ts` — Tests the service layer against real PostgreSQL:
- Token generation and hashing
- Catalog CRUD (create, update, delete items; role enforcement)
- Add request (idempotent), cancel, re-add
- Threshold notification trigger
- Dashboard data loading
- Fulfill flow (clears list, creates history)
- Full second cycle
- findOrCreateItem
- Notification read
- Threshold validation

Run all: `bun test` (requires `DATABASE_URL` to point to a running PostgreSQL).

## Styling Conventions

- **CSS Modules only** — No Tailwind, styled-components, or global component CSS.
- **Colocated** — `ComponentName.module.css` next to `ComponentName.tsx`.
- **camelCase class names** — Referenced as `styles.className` in JSX.
- **Design tokens** — Colors, spacing, radii, shadows, typography defined in `src/styles/tokens.module.css`. Use token CSS variables; avoid hard-coded values.
- **Blinkit-inspired** — Bold yellow (#ffde03) primary accent, black/gray text, geometric sans-serif (Inter/DM Sans), clean and minimal.

## Design System (Blinkit / Lambda)

- **Primary accent:** Bright yellow (`#ffde03`)
- **Text:** Black and grays for high contrast
- **Typography:** Inter / DM Sans / geometric sans-serif
- **Structure:** Atomic design — Constants → Elements → Components → Widgets → Pages
- **Philosophy:** Clean, simple, fast to parse. Token-first (no magic numbers).

## Routing

| Path | Access | Description |
|------|--------|-------------|
| `/login` | Public | Magic link sign-in form |
| `/auth/verify` | Public | Magic link token verification (GET handler) |
| `/` | Authenticated | Main dashboard — shared list, product cards, omnisearch, admin panel |

## Common Tasks for Agents

### Adding a new catalog item type or field
1. Update `src/db/schema.ts` (add column)
2. Run `bun run db:generate` then `bun run db:migrate`
3. Update `src/lib/slop/service.server.ts` (queries/mutations)
4. Update `src/lib/server-fns/slop.functions.ts` (server function input validators)
5. Update UI components as needed
6. Add tests

### Adding a new route
1. Create `src/routes/newroute.tsx` (TanStack Start file-based routing)
2. Add optional `*.module.css` for styles
3. Route tree auto-regenerates on dev server restart

### Modifying auth or roles
1. Auth logic: `src/lib/auth/magic-link.server.ts` and `session.server.ts`
2. Role checks: `requireOrderer()` in `session.server.ts`, `assertOrderer()` in `service.server.ts`
3. Allowed domain: `ALLOWED_EMAIL_DOMAIN` env var, checked in `src/lib/env.ts`

### Running in cloud agent environment
1. Ensure PostgreSQL is running (`sudo pg_ctlcluster 16 main start` or use the start script)
2. Ensure `.env.local` exists with valid `DATABASE_URL`
3. Run `bun install && bun run db:migrate`
4. Build: `bun run build` | Dev: `bun run dev` | Test: `bun test`

## PR Screenshot Policy

Any PR that touches frontend code (`.tsx`, `.jsx`, `.module.css`, design tokens, assets, or layout) **must include screenshots** (or GIFs for animations) in the PR description showing the visual result. Use before/after for modifications. Pure refactors with zero visual change may state "No visual change" instead. See `.cursor/rules/frontend-screenshot-policy.mdc` for full details.

## Scope (MVP)

**In scope:** Catalog, requests, fulfillment (immediate + threshold triggers), single shared list, auth with roles, in-app notifications.

**Out of scope:** Inventory tracking, manual order cycles, approvals/budgets, multi-office, Slack integration.

See `.cursor/rules/slop-scope.mdc` for the full scope reference.
