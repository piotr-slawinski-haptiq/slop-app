#!/usr/bin/env bash
set -euo pipefail

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

install_apt_prerequisites() {
  if ! command -v apt-get >/dev/null 2>&1; then
    return
  fi

  local installer=""
  if [ "$(id -u)" -eq 0 ]; then
    installer=""
  elif command -v sudo >/dev/null 2>&1 && sudo -n true >/dev/null 2>&1; then
    installer="sudo"
  else
    echo "Skipping apt prerequisites (no root/sudo access)."
    return
  fi

  ${installer} apt-get update
  ${installer} apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    unzip \
    build-essential \
    pkg-config \
    python3 \
    make \
    g++ \
    libssl-dev \
    postgresql-client

  if is_truthy "${INSTALL_LOCAL_POSTGRES_SERVER:-0}"; then
    ${installer} apt-get install -y --no-install-recommends postgresql
  fi
}

install_bun() {
  if command -v bun >/dev/null 2>&1; then
    return
  fi

  echo "Installing Bun..."
  curl -fsSL https://bun.sh/install | bash
}

ensure_bun_path() {
  export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
  export PATH="$BUN_INSTALL/bin:$PATH"
}

install_project_dependencies() {
  if [ ! -f package.json ]; then
    return
  fi

  ensure_bun_path
  if [ -f bun.lock ]; then
    bun install --frozen-lockfile || bun install
  else
    bun install
  fi

  # Warm the local bunx cache for Drizzle workflows.
  bunx drizzle-kit --version >/dev/null 2>&1 || true
}

main() {
  install_apt_prerequisites
  install_bun
  ensure_bun_path
  install_project_dependencies

  echo "Cloud install complete."
}

main "$@"
