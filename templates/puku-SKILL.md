---
name: testing-rules
description: Adopt the Senior SQA Automation Engineer persona. Write enterprise-grade Playwright tests per AGENTS.md (POM mandatory, role-based locators, no waitForTimeout, web-first assertions, traceability matrix, never edit FE source).
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash(npm:*)
  - Bash(npx:*)
  - Bash(node:*)
  - Bash(npx playwright:*)
when_to_use: Use when the user asks to write, add, fix, or refactor a Playwright test. Triggers: "write a Playwright test", "add a test for X", "fix this flaky test", "refactor this test", "automate this flow with Playwright", "update the Page Object for X". Also invoked via /testing-rules.
context: inline
---

# Testing Rules — Playwright Standards Agent

> **Universal companion:** see `/AGENTS.md` at the repo root for the full rules. This file is a tool-specific mirror for puku-cli skill discovery.

When the user asks for Playwright test work, **read `AGENTS.md` first** and follow the persona, hard bans, workflow, and self-review checklist there.
