#!/usr/bin/env node
/**
 * testing-automation-agent CLI
 *
 * Universal installer — works with Claude Code, puku-cli, Cursor, GitHub Copilot,
 * Codex, Gemini Code Assist, Aider, Continue, Cody, Windsurf, and anything else
 * that respects AGENTS.md or tool-specific rule files.
 *
 * Usage:
 *   npx -y github:faisalBS23/testing-automation-agent           # install into the current repo
 *   npx -y github:faisalBS23/testing-automation-agent --global   # install into ~/.agents/, ~/, etc.
 *   npx -y github:faisalBS23/testing-automation-agent --tools claude,puku
 *                                                                # pick which tool mirrors to install
 *   npx -y github:faisalBS23/testing-automation-agent --help
 *
 * What it does:
 *   Downloads AGENTS.md (the universal persona/rules file) plus tool-specific
 *   mirrors for whichever AI coding tools the user selects, and drops them
 *   into the user's project (or their home directory for global install).
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

const REPO_OWNER = 'faisalBS23';
const REPO_NAME = 'testing-automation-agent';
const BRANCH = 'main';
const RAW_BASE = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}`;

// Files we know how to install: [local-source-path, description]
const FILES = {
  // Universal — works in every AI tool that reads AGENTS.md
  'AGENTS.md': 'Universal persona + rules (works in every AI tool)',

  // Tool-specific mirrors — auto-detected unless --tools is passed
  '.claude/skills/testing-rules/SKILL.md': 'Claude Code skill mirror',
  '.cursor/rules/testing-standards.mdc': 'Cursor rule mirror',
  '.github/copilot-instructions.md': 'GitHub Copilot instructions mirror',
  '.puku-cli/skills/testing-rules/SKILL.md': 'puku-cli skill mirror',
};

function parseArgs(argv) {
  const args = {
    global: false,
    help: false,
    tools: null,           // null = auto-detect / install all
    explicitTools: [],     // tools listed explicitly via --tools
  };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--global' || arg === '-g') args.global = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg === '--tools') {
      args.explicitTools = argv[++i].split(',').map((s) => s.trim().toLowerCase());
    }
  }
  return args;
}

function printHelp() {
  console.log(`testing-automation-agent — installs the SQA Playwright persona/rules.

Usage:
  npx testing-automation-agent                       # project-local: ./AGENTS.md + tool mirrors
  npx testing-automation-agent --global              # personal: ~/.agents/AGENTS.md etc.
  npx testing-automation-agent --tools claude,puku   # only Claude + puku-cli mirrors
  npx testing-automation-agent --help

Supported tools (auto-detected unless --tools is passed):
  AGENTS.md         every AI tool (Claude Code, Cursor, Codex, Copilot, ...)
  .agent/...        .agent convention (JetBrains AI, Sourcegraph Cody, Windsurf, ...)
  .claude/...       Claude Code skill
  .cursor/...       Cursor rule
  .github/...       GitHub Copilot
  .puku-cli/...     puku-cli skill

After install, restart your AI tool and try:
  "write a Playwright test for the login page"
`);
}

function download(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return download(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function selectFiles(args) {
  // Always include AGENTS.md
  const picks = ['AGENTS.md'];
  const toolToFile = {
    agent: '.agent/rules/testing-rules.md',
    claude: '.claude/skills/testing-rules/SKILL.md',
    cursor: '.cursor/rules/testing-standards.mdc',
    copilot: '.github/copilot-instructions.md',
    puku: '.puku-cli/skills/testing-rules/SKILL.md',
    'puku-cli': '.puku-cli/skills/testing-rules/SKILL.md',
  };

  if (args.explicitTools.length > 0) {
    for (const tool of args.explicitTools) {
      const file = toolToFile[tool];
      if (file) picks.push(file);
      else console.warn(`Unknown tool "${tool}" — skipping. Known: ${Object.keys(toolToFile).join(', ')}`);
    }
  } else {
    // Auto: include all known tool mirrors
    Object.values(toolToFile).forEach((f) => picks.push(f));
  }
  return picks;
}

function destinationRoot(args) {
  if (args.global) {
    // Personal install: AGENTS.md in user home (most AI tools read ~/AGENTS.md
    // or resolve relative to cwd anyway, but home is the safe default).
    return os.homedir();
  }
  return process.cwd();
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const files = selectFiles(args);
  const base = destinationRoot(args);

  console.log(`Installing ${files.length} file(s) into ${base}\n`);

  for (const relPath of files) {
    const url = `${RAW_BASE}/${relPath}`;
    const dest = path.join(base, relPath);
    process.stdout.write(`  ${relPath} ... `);
    try {
      const content = await download(url);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, content, 'utf8');
      console.log('ok');
    } catch (err) {
      console.log(`FAIL (${err.message})`);
      process.exitCode = 1;
    }
  }

  if (process.exitCode === 1) return;

  console.log(`\nInstalled to ${base}`);
  console.log(`\nNext steps:`);
  console.log(`  1. Restart your AI coding tool (Claude Code, puku-cli, Cursor, etc.)`);
  console.log(`  2. Ask: "write a Playwright test for the login page"`);
  console.log(`     or explicitly: /testing-rules`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
