<div align="center">

# testing-rules

**Drop-in Senior SQA Automation Engineer persona for Playwright.**

Role-based locators. POM. Web-first assertions. Never edit app source.

</div>

<a href="https://www.npmjs.com/package/testing-automation-agent"><img src="https://img.shields.io/npm/v/testing-automation-agent?style=flat-square&color=F0A63C" alt="npm"></a>
<a href="https://github.com/faisalBS23/testing-automation-agent/blob/main/package.json"><img src="https://img.shields.io/badge/node-%3E%3D18-blue?style=flat-square" alt="node"></a>
<a href="./LICENSE"><img src="https://img.shields.io/github/license/faisalBS23/testing-automation-agent?style=flat-square&color=green" alt="license"></a>
<a href="https://github.com/faisalBS23/testing-automation-agent/stargazers"><img src="https://img.shields.io/github/stars/faisalBS23/testing-automation-agent?style=flat-square" alt="stars"></a>

---

## ⚡ Quick Start

Three doors into the cave. Pick one.

### 1. One-line installer (any OS, recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/faisalBS23/testing-automation-agent/v2.0.0/install.sh | bash -s -- --all
```

Windows PowerShell:

```powershell
irm https://raw.githubusercontent.com/faisalBS23/testing-automation-agent/v2.0.0/install.ps1 | iex -ArgumentList '--all'
```

### 2. npx

```bash
npx -y github:faisalBS23/testing-automation-agent --all
```

### 3. npm (when published)

```bash
npm install -g testing-automation-agent
testing-rules --all
```

The installer drops the right file for each AI tool. Re-run any time — it's idempotent.

---

## 🪨 What you get

| Provider | Dropped where | Mode |
|---|---|---|
| `agents` | `AGENTS.md` (universal) | merge under HTML markers |
| `claude` | `.claude/skills/testing-rules/SKILL.md` | skip-on-exist |
| `cursor` | `.cursor/rules/testing-rules.mdc` | skip-on-exist |
| `copilot` | `.github/copilot-instructions.md` | skip-on-exist |
| `puku` | `.puku-cli/skills/testing-rules/SKILL.md` | skip-on-exist |
| `agent-rule` | `.agent/rules/testing-rules.md` | skip-on-exist |

Pick one, pick all. Each install is one file. The agent reloads automatically when you reopen it.

---

## 🧭 Flags

```text
testing-rules [flags]

  --all                  Install every provider
  --minimal              Only the universal AGENTS.md
  --only <id>            Only the named provider (repeatable)
  --tools <a,b,c>        Comma-separated list
  --scope <project|global>
                         project = current dir (default), global = ~/.testing-rules/
  --global, -g           Alias for --scope global
  --dry-run              Print what would happen, write nothing
  --force                Overwrite skip-on-exist files
  --uninstall, -u        Strip marker blocks / delete installed files
  --non-interactive, -y  Skip prompts (CI/no-TTY)
  --list                 Print the provider matrix
  --version, -V
  --help, -h
  --no-color
```

---

## 🌍 Scope: project vs global

- **project** (default): drops rules into `./AGENTS.md`, `./.claude/skills/...` etc. Right thing for one repo.
- **global** (`--global` / `-g`): drops rules into `~/.testing-rules/AGENTS.md` and per-tool config roots. Use when you want one install to cover every repo.

Override the global home with `TESTING_RULES_HOME=/some/path`.

---

## 🧪 What the agent does

Once installed, your AI tool acts as a **Senior/Staff-Level SQA Automation Engineer** when writing Playwright tests in this repo:

- **Hard Bans** — no `waitForTimeout` without a reason, no CSS/XPath in specs, no `page.locator` inside `.spec.ts`, never edit FE source, never remove assertions to force green.
- **Locator hierarchy** — `getByRole` → `getByLabel` → `getByText` → `getByPlaceholder` → `getByTitle` → `getByTestId` (only if it already exists in the DOM).
- **POM mandatory** — every spec calls page-object methods. All locators live in `tests/page-objects/<module>/<feature>.page.ts`.
- **Traceability matrix** — every test gets a `TC-<MODULE>-<SUBMODULE>-<LAYER>-<NNN>` ID and a row in `traceability/TEST_MATRIX.md`. App bugs get logged as `❌ dev bug`, never fixed in the test script.
- **Git Safety** — read-only git is allowed without approval; `git commit` / `git push` / `git reset` etc. require explicit human approval **in the current message**.

Full ruleset: see `skills/testing-rules/agents.md`.

---

## 🧹 Uninstall

```bash
testing-rules -u --all
```

For `AGENTS.md` (merge-marker), this strips the `<!-- testing-rules:agents:start/end -->` block — your other content survives. For all other providers, the installed file is deleted (only if it looks like ours; `--force` to delete any file at that path).

---

## 🪪 License

MIT — see [LICENSE](./LICENSE).

---

<div align="center">

[Install](./INSTALL.md) · [Issues](https://github.com/faisalBS23/testing-automation-agent/issues) · [Source](https://github.com/faisalBS23/testing-automation-agent)

</div>
