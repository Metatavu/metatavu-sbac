#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 || "$1" != "--folder" ]]; then
  printf 'Usage: %s --folder <blueprint-folder> [--port <port>]\n' "$0" >&2
  exit 64
fi

# Override this for a fork, branch, tag, or self-hosted Git repository.
: "${SBAC_PACKAGE:=github:metatavu/metatavu-sbac#main}"

exec npx --yes --package="$SBAC_PACKAGE" sbac "$@"