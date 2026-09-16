#!/usr/bin/env bash
# Install the SQA automation agent skill into the current repo (or your home).
# Usage:
#   ./install.sh           # install into current repo (.puku-cli/skills/testing-rules/)
#   ./install.sh --global  # install into ~/.puku-cli/skills/testing-rules/
set -e

REPO="https://raw.githubusercontent.com/faisalBS23/testing-automation-agent/main/.puku-cli/skills/testing-rules/SKILL.md"

if [[ "${1:-}" == "--global" ]]; then
  DEST="$HOME/.puku-cli/skills/testing-rules/SKILL.md"
else
  DEST=".puku-cli/skills/testing-rules/SKILL.md"
fi

mkdir -p "$(dirname "$DEST")"
curl -fsSL "$REPO" -o "$DEST"

echo "Installed to $DEST"
echo "Restart puku-cli and try: 'write a Playwright test for the login page'"
