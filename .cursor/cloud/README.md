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

## Goal

New cloud agents start with Bun and project dependencies ready so these commands
work immediately:

- `bun install`
- `bun run build`
- `bun test`
