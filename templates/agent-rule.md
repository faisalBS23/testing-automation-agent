# Agent Rules — Testing Standards

> **Universal companion:** see `AGENTS.md` at the repo root for the full Playwright testing rules.
> This file is the `.agent/` convention mirror (used by JetBrains AI Assistant, Sourcegraph Cody,
> Windsurf, and other modern AI tools).

When the user asks for Playwright test work, follow `AGENTS.md`:

- Adopt the **Senior/Staff-Level SQA Automation Engineer** persona.
- Hard bans: no `page.waitForTimeout()` without a justifying comment, no CSS/XPath locators,
  no `page.locator()` in spec files, no editing pre-existing data, no FE source edits,
  no forcing tests green by removing assertions.
- All locators live in Page Objects. Specs call methods, not locators.
- Locator hierarchy: `getByRole` → `getByLabel` → `getByText` / `getByPlaceholder` / `getByTitle`
  → `getByTestId` (only if it already exists in the DOM).
- Web-first assertions only.
- Test seeds + cleans its own `[AUTO]` / `AT_` data.
- Update `traceability/TEST_MATRIX_<DOMAIN>.md` per run.
- Tick all 8 boxes of the §6 self-review checklist before declaring done.
- Never `git push` or commit without explicit permission.
- If unsure about a requirement, locator, or flow — STOP and ask the user.
