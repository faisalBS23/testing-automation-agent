#!/usr/bin/env bash
# Universal installer for the SQA Playwright testing agent.
# Works in Claude Code, puku-cli, Cursor, GitHub Copilot, Codex, etc.
#
# Usage:
#   ./install.sh                          # install into current repo (./AGENTS.md + tool mirrors)
#   ./install.sh --global                 # install into $HOME
#   ./install.sh --tools claude,puku      # only specific tool mirrors
#   ./install.sh --help

set -e

REPO="https://raw.githubusercontent.com/faisalBS23/testing-automation-agent/main"

print_help() {
  cat <<EOF
testing-automation-agent — installs the SQA Playwright persona/rules into your repo.

Usage:
  ./install.sh                          # project-local
  ./install.sh --global                 # personal
  ./install.sh --tools claude,puku      # specific tool mirrors
  ./install.sh --help

After install, restart your AI coding tool and try:
  "write a Playwright test for the login page"
EOF
}

DEST="."
TOOLS=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --global|-g) DEST="$HOME" ;;
    --help|-h) print_help; exit 0 ;;
    --tools) TOOLS="$2"; shift ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
  shift
done

# Always install AGENTS.md (universal)
FILES=("AGENTS.md")

# Tool-specific mirrors
if [[ -z "$TOOLS" ]]; then
  FILES+=(
    ".agent/rules/testing-rules.md"
    ".claude/skills/testing-rules/SKILL.md"
    ".cursor/rules/testing-standards.mdc"
    ".github/copilot-instructions.md"
    ".puku-cli/skills/testing-rules/SKILL.md"
  )
else
  IFS=',' read -ra TOOL_LIST <<< "$TOOLS"
  for tool in "${TOOL_LIST[@]}"; do
    case "$tool" in
      agent)     FILES+=(".agent/rules/testing-rules.md") ;;
      claude)    FILES+=(".claude/skills/testing-rules/SKILL.md") ;;
      cursor)    FILES+=(".cursor/rules/testing-standards.mdc") ;;
      copilot)   FILES+=(".github/copilot-instructions.md") ;;
      puku|puku-cli) FILES+=(".puku-cli/skills/testing-rules/SKILL.md") ;;
      *) echo "Unknown tool: $tool (skipping)" ;;
    esac
  done
fi

echo "Installing ${#FILES[@]} file(s) into $DEST"
for rel in "${FILES[@]}"; do
  url="$REPO/$rel"
  dest="$DEST/$rel"
  mkdir -p "$(dirname "$dest")"
  printf "  %s ... " "$rel"
  if curl -fsSL "$url" -o "$dest"; then
    echo "ok"
  else
    echo "FAIL"
    exit 1
  fi
done

echo
echo "Installed to $DEST"
echo "Next: restart your AI tool and try: 'write a Playwright test for the login page'"
