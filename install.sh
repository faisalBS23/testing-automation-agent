#!/usr/bin/env bash
# Universal interactive installer — Senior SQA Playwright testing agent.
# Works in Claude Code, puku-cli, Cursor, GitHub Copilot, JetBrains AI,
# Sourcegraph Cody, Windsurf, and any tool that reads AGENTS.md.
#
# Conflict handling:
#   - AGENTS.md: append/replace a `<!-- testing-rules:start/end -->` marker
#     block. Preserves the user's existing content. Idempotent on re-install.
#   - Tool-specific files (SKILL.md, .mdc, copilot-instructions.md, .agent/...):
#     SKIP if the file already exists locally.
#
# Usage:
#   ./install.sh                                    # interactive
#   ./install.sh --global                           # global install
#   ./install.sh --non-interactive --tools claude,cursor --scope project
#   ./install.sh --help

set -e

REPO="https://raw.githubusercontent.com/faisalBS23/testing-automation-agent/main"
TEMPLATES_BASE="$REPO/templates"
MARKER_START='<!-- testing-rules:start -->'
MARKER_END='<!-- testing-rules:end -->'

# [id|label|local-path|template-url|description]
TOOLS=(
  "agents|AGENTS.md (universal)|AGENTS.md|$TEMPLATES_BASE/AGENTS.md|Universal — every AI tool"
  "agent|.agent/ convention|.agent/rules/testing-rules.md|$TEMPLATES_BASE/agent-rule.md|JetBrains AI, Sourcegraph Cody, Windsurf"
  "claude|Claude Code|.claude/skills/testing-rules/SKILL.md|$TEMPLATES_BASE/claude-SKILL.md|Anthropic Claude Code"
  "cursor|Cursor|.cursor/rules/testing-standards.mdc|$TEMPLATES_BASE/cursor-rule.mdc|Cursor rule"
  "copilot|GitHub Copilot|.github/copilot-instructions.md|$TEMPLATES_BASE/copilot-instructions.md|GitHub Copilot"
  "puku|puku-cli|.puku-cli/skills/testing-rules/SKILL.md|$TEMPLATES_BASE/puku-SKILL.md|puku-cli skill"
)

print_help() {
  cat <<EOF
testing-automation-agent — installs the SQA Playwright persona/rules.

Usage:
  ./install.sh                                    # interactive picker
  ./install.sh --global                           # global install
  ./install.sh --non-interactive --tools claude,cursor --scope project
  ./install.sh --help

Conflict handling:
  - AGENTS.md         appended/merged under marker comments
  - Other tool files  skipped if they already exist (delete to re-install)

Supported tools:
  agents    AGENTS.md (universal — every AI tool)
  agent     .agent/ convention
  claude    Claude Code skill
  cursor    Cursor rule
  copilot   GitHub Copilot instructions
  puku      puku-cli skill
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
  echo
  echo "Existing files are preserved: AGENTS.md is merged under markers,"
  echo "tool-specific files are skipped if they already exist."
}

pick_scope() {
  echo
  echo "Where should the skill be installed?"
  echo "  [1] Project — current directory only"
  echo "  [2] Global  — $HOME (follows you across all repos)"
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
    IFS='|' read -r id label file url desc <<< "$tool"
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

# Merge a new block into an existing file using marker comments.
# In-place update of $1 (existing file), with $2 (new content) wrapped by markers.
merge_marker_block() {
  local existing_file="$1"
  local new_content="$2"
  local existing
  existing=$(cat "$existing_file")

  # Check if marker block exists
  if echo "$existing" | grep -qF "$MARKER_START"; then
    # Replace existing marker block with new one
    # Use awk to do the multi-line replacement
    local merged
    merged=$(awk -v start="$MARKER_START" -v end="$MARKER_END" -v block="\n${MARKER_START}\n${new_content}\n${MARKER_END}\n" '
      BEGIN { in_block = 0 }
      {
        if (index($0, start) > 0) { in_block = 1; if (!done) { printf "%s", block; done = 1 }; next }
        if (index($0, end) > 0) { in_block = 0; next }
        if (!in_block) print $0
      }
    ' <<< "$existing")
    echo "$merged" > "$existing_file"
  else
    # Append marker block at end
    local sep
    if [[ -s "$existing_file" ]] && [[ "$(tail -c 1 "$existing_file")" != "" ]]; then
      sep="\n\n"
    else
      sep=""
    fi
    printf "%s%s%s\n%s\n%s\n" "$existing" "$sep" "$MARKER_START" "$new_content" "$MARKER_END" > "$existing_file.tmp"
    mv "$existing_file.tmp" "$existing_file"
  fi
}

# Install one file. Echoes one of: created|merged|unchanged|skipped|fail:<reason>
install_file() {
  local dest="$1"
  local url="$2"
  local is_agents="$3"
  local exists=0
  [[ -f "$dest" ]] && exists=1

  # Tool-specific files: skip if exists
  if [[ "$is_agents" != "true" && "$exists" == "1" ]]; then
    echo "skipped:already exists"
    return 0
  fi

  # Download template
  local tmp
  tmp=$(mktemp)
  if ! curl -fsSL "$url" -o "$tmp"; then
    rm -f "$tmp"
    echo "fail:download"
    return 1
  fi
  local content
  content=$(cat "$tmp")
  rm -f "$tmp"

  mkdir -p "$(dirname "$dest")"

  if [[ "$is_agents" == "true" ]]; then
    if [[ "$exists" == "1" ]]; then
      local before
      before=$(cat "$dest")
      merge_marker_block "$dest" "$content"
      local after
      after=$(cat "$dest")
      if [[ "$before" == "$after" ]]; then
        echo "unchanged"
      else
        echo "merged"
      fi
    else
      printf "%s\n%s\n%s\n" "$MARKER_START" "$content" "$MARKER_END" > "$dest"
      echo "created"
    fi
  else
    echo "$content" > "$dest"
    echo "created"
  fi
  return 0
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

if [[ "$scope" == "global" ]]; then
  base="$HOME"
else
  base="."
fi

echo
echo "Installing into $base:"

created=0; merged=0; skipped=0; unchanged=0; failed=0

for id in "${TOOL_LIST[@]}"; do
  # Find the matching tool entry
  file=""
  url=""
  is_agents="false"
  for tool in "${TOOLS[@]}"; do
    IFS='|' read -r tid label tfile turl desc <<< "$tool"
    if [[ "$tid" == "$id" ]]; then
      file="$tfile"
      url="$turl"
      [[ "$tid" == "agents" ]] && is_agents="true"
      break
    fi
  done
  if [[ -z "$file" ]]; then
    printf "  %-48s unknown tool — skipped\n" "$id"
    continue
  fi

  dest="$base/$file"
  result=$(install_file "$dest" "$url" "$is_agents" || echo "fail:install")

  case "$result" in
    created)   printf "  %-48s created\n" "$file"; created=$((created+1)) ;;
    merged)    printf "  %-48s merged (AGENTS.md marker block)\n" "$file"; merged=$((merged+1)) ;;
    unchanged) printf "  %-48s unchanged\n" "$file"; unchanged=$((unchanged+1)) ;;
    skipped*)  printf "  %-48s skipped (%s)\n" "$file" "${result#skipped:}"; skipped=$((skipped+1)) ;;
    fail*)     printf "  %-48s FAIL (%s)\n" "$file" "${result#fail:}"; failed=$((failed+1)) ;;
  esac
done

echo
echo "Summary: $created created, $merged merged, $skipped skipped, $unchanged unchanged"
(( failed > 0 )) && exit 1

echo
echo "✓ Done."
echo
echo "Next steps:"
echo "  1. Restart your AI coding tool (Claude Code, puku-cli, Cursor, JetBrains AI, ...)"
echo "  2. Ask: \"write a Playwright test for the login page\""
echo "     or explicitly: /testing-rules"
