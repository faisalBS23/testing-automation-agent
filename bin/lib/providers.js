'use strict';

// Single source of truth for supported AI coding agents.
// Each entry maps to one installable file and one placement location.
//
// Fields:
//   id           - canonical id used by --only/--tools
//   label        - human-readable label
//   targetPath   - function(scope, ctx) -> absolute target path
//   mode         - 'merge-marker' (idempotent merge under HTML markers)
//                  or 'skip-on-exist' (write once, skip if file present)
//   sourceFile   - file under skills/testing-rules/ that we ship
//   description  - one-liner for --list

const path = require('path');

const REPO = 'faisalBS23/testing-automation-agent';

function getRef() {
  return process.env.TESTING_RULES_REF || 'v2.1.0';
}

function getRawBase() {
  return `https://raw.githubusercontent.com/${REPO}/${getRef()}`;
}

function resolveSourceFile(provider, ref = getRef()) {
  return `https://raw.githubusercontent.com/${REPO}/${ref}/skills/testing-rules/${provider.sourceFile}`;
}

const PROVIDERS = [
  {
    id: 'agents',
    label: 'AGENTS.md (universal)',
    sourceFile: 'agents.md',
    mode: 'merge-marker',
    description: 'Universal agent rules, merged into existing AGENTS.md under HTML marker block',
    targetPath: (scope) => path.join(scope === 'global' ? globalHome() : process.cwd(), 'AGENTS.md'),
  },
  {
    id: 'claude',
    label: 'Claude Code',
    sourceFile: 'claude-SKILL.md',
    mode: 'skip-on-exist',
    description: 'Drop SKILL.md into .claude/skills/testing-rules/',
    targetPath: (scope) => path.join(scope === 'global' ? globalHome() : process.cwd(), '.claude', 'skills', 'testing-rules', 'SKILL.md'),
  },
  {
    id: 'cursor',
    label: 'Cursor',
    sourceFile: 'cursor-rule.mdc',
    mode: 'skip-on-exist',
    description: 'Drop rule into .cursor/rules/testing-rules.mdc',
    targetPath: (scope) => path.join(scope === 'global' ? globalHome() : process.cwd(), '.cursor', 'rules', 'testing-rules.mdc'),
  },
  {
    id: 'copilot',
    label: 'GitHub Copilot',
    sourceFile: 'copilot-instructions.md',
    mode: 'skip-on-exist',
    description: 'Drop instructions into .github/copilot-instructions.md',
    targetPath: (scope) => path.join(scope === 'global' ? globalHome() : process.cwd(), '.github', 'copilot-instructions.md'),
  },
  {
    id: 'puku',
    label: 'puku-cli',
    sourceFile: 'puku-SKILL.md',
    mode: 'skip-on-exist',
    description: 'Drop SKILL.md into .puku-cli/skills/testing-rules/',
    targetPath: (scope) => path.join(scope === 'global' ? globalHome() : process.cwd(), '.puku-cli', 'skills', 'testing-rules', 'SKILL.md'),
  },
  {
    id: 'agent-rule',
    label: '.agent/rules/ (JetBrains, Cody, Windsurf)',
    sourceFile: 'agent-rule.md',
    mode: 'skip-on-exist',
    description: 'Drop rule into .agent/rules/testing-rules.md',
    targetPath: (scope) => path.join(scope === 'global' ? globalHome() : process.cwd(), '.agent', 'rules', 'testing-rules.md'),
  },
];

function globalHome() {
  return process.env.TESTING_RULES_HOME || path.join(require('os').homedir(), '.testing-rules');
}

function findProvider(idOrAlias) {
  const lc = String(idOrAlias || '').toLowerCase();
  return PROVIDERS.find(p => p.id === lc || p.label.toLowerCase() === lc);
}

module.exports = {
  REPO,
  PROVIDERS,
  getRef,
  getRawBase,
  resolveSourceFile,
  globalHome,
  findProvider,
};
