# Install — testing-rules

Four doors into the cave. Pick one.

---

## 1. curl | bash (any Unix)

```bash
curl -fsSL https://raw.githubusercontent.com/faisalBS23/testing-automation-agent/v2.1.0/install.sh | bash -s -- --all
```

Pass any flag after `--`:

```bash
curl -fsSL .../install.sh | bash -s -- --only claude --scope global --force
```

## 2. irm | iex (Windows PowerShell 5.1+)

```powershell
irm https://raw.githubusercontent.com/faisalBS23/testing-automation-agent/v2.1.0/install.ps1 | iex -ArgumentList '--all'
```

## 3. npx (cross-platform, no install required)

```bash
npx -y github:faisalBS23/testing-automation-agent --all
```

Override the ref for testing:

```bash
TESTING_RULES_REF=main npx -y github:faisalBS23/testing-automation-agent --all --dry-run
```

## 4. npm (when published to the registry)

```bash
npm install -g testing-automation-agent
testing-rules --all
```

---

## Per-agent one-liners

Each row installs only the named provider into the current directory.

| Agent / IDE | Command |
|---|---|
| Universal (`AGENTS.md`) | `npx -y github:faisalBS23/testing-automation-agent --only agents` |
| Claude Code | `npx -y github:faisalBS23/testing-automation-agent --only claude` |
| Cursor | `npx -y github:faisalBS23/testing-automation-agent --only cursor` |
| GitHub Copilot | `npx -y github:faisalBS23/testing-automation-agent --only copilot` |
| puku-cli | `npx -y github:faisalBS23/testing-automation-agent --only puku` |
| JetBrains AI / Cody / Windsurf | `npx -y github:faisalBS23/testing-automation-agent --only agent-rule` |

Want every provider? Drop `--only` and pass `--all`:

```bash
npx -y github:faisalBS23/testing-automation-agent --all
```

---

## Global install

By default the installer writes to the current directory (`--scope project`). To install once and cover every repo on your machine, use `--scope global` (or `-g`). The files land in `~/.testing-rules/`.

```bash
npx -y github:faisalBS23/testing-automation-agent --all --global
```

The exact final location depends on the agent: most will read from a global config root (`~/.claude/`, `~/.config/github-copilot/`, etc.). See `bin/lib/providers.js` for the canonical mapping.

---

## Dry-run

See what would be written without touching the filesystem:

```bash
npx -y github:faisalBS23/testing-automation-agent --all --dry-run
```

---

## Uninstall

```bash
npx -y github:faisalBS23/testing-automation-agent --uninstall --all
```

For `AGENTS.md` this strips the marker block (your other content survives). For other providers it deletes the file. Use `--force` if the installer refuses to delete a file it didn't write.

---

## Local development

Clone the repo and run the installer against any directory:

```bash
git clone https://github.com/faisalBS23/testing-automation-agent
cd testing-automation-agent
node bin/install.js --only agents --dry-run
```

Set `TESTING_RULES_REF=main` to fetch from `main` instead of the pinned tag.
