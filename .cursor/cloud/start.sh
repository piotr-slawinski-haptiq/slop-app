#!/usr/bin/env bash
set -euo pipefail

export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
export PATH="$BUN_INSTALL/bin:$PATH"

if [ -f package.json ] && [ ! -d node_modules ]; then
  if [ -f bun.lock ]; then
    bun install --frozen-lockfile || bun install
  else
    bun install
  fi
fi

if [ -f .env.example ] && [ ! -f .env.local ]; then
  cp .env.example .env.local
fi

echo "Cloud start complete."
if command -v bun >/dev/null 2>&1; then
  echo "Bun version: $(bun --version)"
else
  echo "Warning: bun is not available in PATH."
fi
