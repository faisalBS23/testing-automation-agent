#!/usr/bin/env bash
# Universal interactive installer — Senior SQA Playwright testing agent.
# Works in Claude Code, puku-cli, Cursor, GitHub Copilot, JetBrains AI,
# Sourcegraph Cody, Windsurf, and any tool that reads AGENTS.md.
#
# Usage:
#   ./install.sh                                    # interactive
#   ./install.sh --global                           # install globally
#   ./install.sh --non-interactive --tools claude,cursor --scope project
#   ./install.sh --help

set -e

REPO="https://raw.githubusercontent.com/faisalBS23/testing-automation-agent/main"

# [id, label, file, description]
TOOLS=(
  "agent|.agent/ convention|.agent/rules/testing-rules.md|JetBrains AI, Sourcegraph Cody, Windsurf"
  "claude|Claude Code|.claude/skills/testing-rules/SKILL.md|Anthropic Claude Code skill discovery"
  "cursor|Cursor|.cursor/rules/testing-standards.mdc|Cursor rule discovery"
  "copilot|GitHub Copilot|.github/copilot-instructions.md|GitHub Copilot workspace instructions"
  "puku|puku-cli|.puku-cli/skills/testing-rules/SKILL.md|puku-cli skill discovery"
)

print_help() {
  cat <<EOF
testing-automation-agent — installs the SQA Playwright persona/rules.

Usage:
  ./install.sh                                    # interactive picker
  ./install.sh --global                           # global install
  ./install.sh --non-interactive --tools claude,cursor --scope project
  ./install.sh --help

Interactive flow:
  1. Project or Global?
  2. Which AI tools? (multi-select)
  3. Confirm? (y/n)
  4. Install.
EOF
}

GLOBAL=0
NONINTERACTIVE=0
SCOPE=""
TOOL_LIST=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --global|-g)        GLOBAL=1 ;;
    --non-interactive|-y) NONINTERACTIVE=1 ;;
    --scope)            SCOPE="$2"; shift ;;
    --tools)            TOOL_LIST=($(echo "$2" | tr ',' ' ')); shift ;;
    --help|-h)          print_help; exit 0 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
  shift
done

banner() {
  echo "┌──────────────────────────────────────────────────────────────┐"
  echo "│  testing-automation-agent — Senior SQA Playwright installer  │"
  echo "└──────────────────────────────────────────────────────────────┘"
}

pick_scope() {
  echo
  echo "Where should the skill be installed?"
  echo "  [1] Project — current directory only"
  echo "  [2] Global  — follows you across all repos"
  while true; do
    read -rp "$(echo -e '\nChoose 1 or 2: ')" ans
    case "$ans" in
      1) echo "project"; return ;;
      2) echo "global"; return ;;
      *) echo "  Please enter 1 or 2." ;;
    esac
  done
}

pick_tools() {
  echo
  echo "Which AI tools do you want to install for?"
  echo "Enter a comma-separated list of numbers (e.g. \"1,2,4\"), or \"all\"."
  echo
  local i=1
  for tool in "${TOOLS[@]}"; do
    IFS='|' read -r id label file desc <<< "$tool"
    printf "  [%d] %-26s — %s\n" "$i" "$label" "$desc"
    i=$((i+1))
  done
  echo "  [all] Install all of the above"

  while true; do
    read -rp "$(echo -e '\nSelect (numbers or "all"): ')" ans
    [[ "$ans" == "all" || "$ans" == "a" ]] && echo "all" && return
    local bad=0
    local selected=()
    IFS=',' read -ra nums <<< "$ans"
    for n in "${nums[@]}"; do
      n=$(echo "$n" | tr -d ' ')
      if ! [[ "$n" =~ ^[0-9]+$ ]] || (( n < 1 || n > ${#TOOLS[@]} )); then
        echo "  Invalid selection: $n"; bad=1; break
      fi
      selected+=("${TOOLS[$((n-1))]%%|*}")
    done
    if (( bad == 0 )); then
      echo "${selected[@]}"
      return
    fi
  done
}

confirm_yn() {
  while true; do
    read -rp "$1 (y/n): " ans
    case "${ans,,}" in
      y|yes) return 0 ;;
      n|no)  return 1 ;;
    esac
  done
}

if (( NONINTERACTIVE == 0 )); then
  banner
  if [[ -n "$SCOPE" ]]; then
    scope="$SCOPE"
  elif (( GLOBAL == 1 )); then
    scope="global"
  else
    scope=$(pick_scope)
  fi
  IFS=' ' read -ra tool_ids <<< "$(pick_tools)"
  TOOL_LIST=("${tool_ids[@]}")

  echo
  echo "Summary:"
  echo "  Scope : $scope"
  echo "  Tools : ${TOOL_LIST[*]}"
  if ! confirm_yn "Proceed with install?"; then
    echo "Cancelled."
    exit 0
  fi
else
  scope="${SCOPE:-project}"
  if [[ ${#TOOL_LIST[@]} -eq 0 ]]; then
    for tool in "${TOOLS[@]}"; do TOOL_LIST+=("${tool%%|*}"); done
  fi
fi

# Resolve destination root
if [[ "$scope" == "global" ]]; then
  base="$HOME"
else
  base="."
fi

# Build list of files to install (AGENTS.md always + selected tool mirrors)
FILES=("AGENTS.md")
for id in "${TOOL_LIST[@]}"; do
  for tool in "${TOOLS[@]}"; do
    IFS='|' read -r tid label file desc <<< "$tool"
    if [[ "$tid" == "$id" ]]; then
      # avoid duplicates
      if [[ ! " ${FILES[*]} " =~ " $file " ]]; then
        FILES+=("$file")
      fi
    fi
  done
done

echo
echo "Installing ${#FILES[@]} file(s) into $base:"
for rel in "${FILES[@]}"; do
  url="$REPO/$rel"
  dest="$base/$rel"
  mkdir -p "$(dirname "$dest")"
  printf "  %s ... " "$rel"
  if curl -fsSL "$url" -o "$dest"; then
    echo "ok"
  else
    echo "FAIL"; exit 1
  fi
done

echo
echo "✓ Installed to $base"
echo
echo "Next steps:"
echo "  1. Restart your AI coding tool (Claude Code, puku-cli, Cursor, JetBrains AI, ...)"
echo "  2. Ask: \"write a Playwright test for the login page\""
echo "     or explicitly: /testing-rules"
