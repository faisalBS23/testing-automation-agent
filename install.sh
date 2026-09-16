#!/usr/bin/env bash
# testing-rules — bash installer shim.
#
# Thin wrapper around bin/install.js (the unified Node installer).
# Every flag you'd pass to bin/install.js can be passed here; we just forward.
#
# One-line install:
#   curl -fsSL https://raw.githubusercontent.com/faisalBS23/testing-automation-agent/v2.0.0/install.sh | bash
#   curl -fsSL https://raw.githubusercontent.com/faisalBS23/testing-automation-agent/v2.0.0/install.sh | bash -s -- --all
#
# Local clone:
#   bash install.sh [flags]
#
# Why a Node installer? Single source of truth for cross-platform behavior.
# install.sh + install.ps1 used to drift; now they're 30-line shims.

set -euo pipefail

# Resolve own dir. BASH_SOURCE is empty when sourced via `curl | bash`.
here=""
source_path="${BASH_SOURCE[0]:-}"
if [ -n "$source_path" ]; then
  here="$(cd "$(dirname "$source_path")" 2>/dev/null && pwd)" || here=""
fi

# Node >=18 required.
if ! command -v node >/dev/null 2>&1; then
  echo "testing-rules: Node.js (>=18) required. Install: https://nodejs.org/" >&2
  exit 1
fi
NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "testing-rules: Node $NODE_MAJOR too old. Need >=18." >&2
  exit 1
fi

# Local clone path: exec the bundled installer directly.
if [ -n "$here" ] && [ -f "$here/bin/install.js" ]; then
  exec node "$here/bin/install.js" "$@"
fi

# Curl-pipe path: delegate to npx at the pinned tag (override via TESTING_RULES_REF).
if ! command -v npx >/dev/null 2>&1; then
  echo "testing-rules: npx required (ships with Node >=18)." >&2
  exit 1
fi
REF="${TESTING_RULES_REF:-v2.0.0}"
exec npx -y "github:faisalBS23/testing-automation-agent#$REF" "$@"
