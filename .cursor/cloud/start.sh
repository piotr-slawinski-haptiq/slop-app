#!/usr/bin/env bash
set -euo pipefail

export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
export PATH="$BUN_INSTALL/bin:$PATH"

is_truthy() {
  case "${1:-}" in
    1|true|TRUE|True|yes|YES|on|ON)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

wait_for_postgres() {
  local attempts=0
  while [ "$attempts" -lt 20 ]; do
    if pg_isready -q \
      -h "${CURSOR_POSTGRES_HOST}" \
      -p "${CURSOR_POSTGRES_PORT}" \
      -U "${CURSOR_POSTGRES_USER}"; then
      return 0
    fi
    attempts=$((attempts + 1))
    sleep 0.5
  done

  return 1
}

ensure_postgres_database() {
  if ! command -v psql >/dev/null 2>&1; then
    return
  fi

  local exists
  exists="$(
    psql \
      -h "${CURSOR_POSTGRES_HOST}" \
      -p "${CURSOR_POSTGRES_PORT}" \
      -U "${CURSOR_POSTGRES_USER}" \
      -d postgres \
      -tAc "select 1 from pg_database where datname='${CURSOR_POSTGRES_DB}'" \
      2>/dev/null || true
  )"

  if [ "${exists}" = "1" ]; then
    return
  fi

  createdb \
    -h "${CURSOR_POSTGRES_HOST}" \
    -p "${CURSOR_POSTGRES_PORT}" \
    -U "${CURSOR_POSTGRES_USER}" \
    "${CURSOR_POSTGRES_DB}" >/dev/null 2>&1 || true
}

maybe_start_local_postgres() {
  if ! is_truthy "${START_LOCAL_POSTGRES:-0}"; then
    return
  fi

  export CURSOR_POSTGRES_HOST="${CURSOR_POSTGRES_HOST:-127.0.0.1}"
  export CURSOR_POSTGRES_PORT="${CURSOR_POSTGRES_PORT:-5432}"
  export CURSOR_POSTGRES_USER="${CURSOR_POSTGRES_USER:-postgres}"
  export CURSOR_POSTGRES_DB="${CURSOR_POSTGRES_DB:-slop}"
  export CURSOR_POSTGRES_DATA_DIR="${CURSOR_POSTGRES_DATA_DIR:-$HOME/.cursor/postgres/data}"
  export CURSOR_POSTGRES_LOG_FILE="${CURSOR_POSTGRES_LOG_FILE:-$HOME/.cursor/postgres/postgres.log}"

  if ! command -v pg_isready >/dev/null 2>&1; then
    echo "START_LOCAL_POSTGRES requested but pg_isready is unavailable."
    echo "Hint: set INSTALL_LOCAL_POSTGRES_SERVER=1 for install phase."
    return
  fi

  if wait_for_postgres; then
    ensure_postgres_database
    echo "PostgreSQL is already reachable at ${CURSOR_POSTGRES_HOST}:${CURSOR_POSTGRES_PORT}."
    return
  fi

  if command -v pg_ctl >/dev/null 2>&1 && command -v initdb >/dev/null 2>&1; then
    mkdir -p "${CURSOR_POSTGRES_DATA_DIR}" "$(dirname "${CURSOR_POSTGRES_LOG_FILE}")"

    if [ ! -f "${CURSOR_POSTGRES_DATA_DIR}/PG_VERSION" ]; then
      initdb \
        -D "${CURSOR_POSTGRES_DATA_DIR}" \
        --auth=trust \
        --username="${CURSOR_POSTGRES_USER}" >/dev/null
    fi

    pg_ctl \
      -D "${CURSOR_POSTGRES_DATA_DIR}" \
      -l "${CURSOR_POSTGRES_LOG_FILE}" \
      -o "-h ${CURSOR_POSTGRES_HOST} -p ${CURSOR_POSTGRES_PORT}" \
      start >/dev/null 2>&1 || true

    if wait_for_postgres; then
      ensure_postgres_database
      echo "Started local PostgreSQL with pg_ctl."
      return
    fi
  fi

  if command -v service >/dev/null 2>&1 \
    && command -v sudo >/dev/null 2>&1 \
    && sudo -n true >/dev/null 2>&1; then
    sudo service postgresql start >/dev/null 2>&1 || true
    if wait_for_postgres; then
      ensure_postgres_database
      echo "Started local PostgreSQL via service."
      return
    fi
  fi

  echo "Could not auto-start local PostgreSQL."
  echo "Set DATABASE_URL to an external PostgreSQL instance or install server binaries."
}

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

maybe_start_local_postgres

echo "Cloud start complete."
if command -v bun >/dev/null 2>&1; then
  echo "Bun version: $(bun --version)"
else
  echo "Warning: bun is not available in PATH."
fi
