# Cursor Cloud Agent Environment Defaults

This directory configures Cursor Cloud Agent startup for the SLOP repo.

## Files

- `.cursor/environment.json`
  - Registers repo-level install/start commands for cloud agents.
- `.cursor/cloud/install.sh`
  - Installs common TanStack Start + Drizzle + PostgreSQL prerequisites.
  - Installs Bun if missing.
  - Runs `bun install` (prefers `--frozen-lockfile`) and warms `drizzle-kit`.
- `.cursor/cloud/start.sh`
  - Ensures Bun is on `PATH`.
  - Installs dependencies if `node_modules` is missing.
  - Seeds `.env.local` from `.env.example` when available.
  - Optionally starts a local PostgreSQL instance for agent sessions.

## Goal

New cloud agents start with Bun and project dependencies ready so these commands
work immediately:

- `bun install`
- `bun run build`
- `bun test`

## Optional local PostgreSQL startup

Set these in your cloud agent environment when you want an ephemeral local DB:

- `START_LOCAL_POSTGRES=1` — enable local PostgreSQL startup on agent boot.
- `INSTALL_LOCAL_POSTGRES_SERVER=1` — install PostgreSQL server package during install phase (apt-based images).

Optional tuning vars:

- `CURSOR_POSTGRES_HOST` (default: `127.0.0.1`)
- `CURSOR_POSTGRES_PORT` (default: `5432`)
- `CURSOR_POSTGRES_USER` (default: `postgres`)
- `CURSOR_POSTGRES_DB` (default: `slop`)
- `CURSOR_POSTGRES_DATA_DIR` (default: `$HOME/.cursor/postgres/data`)
- `CURSOR_POSTGRES_LOG_FILE` (default: `$HOME/.cursor/postgres/postgres.log`)

If local startup is not possible, the script logs a warning and continues.
