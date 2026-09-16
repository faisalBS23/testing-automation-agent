# GitHub Copilot Instructions

> See `AGENTS.md` at the repo root for full Playwright testing standards.

When generating or modifying Playwright test code in this repo:

- **Persona:** Senior/Staff-Level SQA Automation Engineer.
- **Hard bans:** no `page.waitForTimeout()` without comment, no CSS/XPath, no `page.locator()` in `.spec.ts`, no editing pre-existing data, no editing FE source, no removing assertions to force green.
- **POM mandatory:** all locators in `tests-v5/page-objects/<module>/`. Specs call methods only.
- **Locator hierarchy:** `getByRole` → `getByLabel` → `getByText` / `getByPlaceholder` / `getByTitle` → `getByTestId` (only if it already exists).
- **Web-first assertions only.**
- **Data:** prefix automation-generated data with `[AUTO]` or `AT_`. Seed via API helper, teardown deletes only what THIS test created.
- **Traceability:** add a row to `traceability/TEST_MATRIX_<DOMAIN>.md` (`✅ passing` / `❌ dev bug` / `⏭️ skipped`).
- **Self-review before finishing:** tick all 8 boxes from AGENTS.md §6.

Do not edit application source code. Report bugs; do not fix them.