#!/usr/bin/env node
/**
 * testing-automation-agent — universal interactive installer.
 *
 * One-command install for the Senior SQA Playwright testing persona/rules,
 * for any AI coding tool (Claude Code, puku-cli, Cursor, GitHub Copilot,
 * JetBrains AI Assistant, Sourcegraph Cody, Windsurf, ...).
 *
 * Usage:
 *   npx -y github:faisalBS23/testing-automation-agent
 *   npx -y github:faisalBS23/testing-automation-agent --global
 *   npx -y github:faisalBS23/testing-automation-agent --non-interactive --tools claude,cursor --scope project
 *   npx -y github:faisalBS23/testing-automation-agent --help
 *
 * Interactive flow:
 *   1. Project or Global?
 *   2. Which AI tools? (multi-select)
 *   3. Confirm? (y/n)
 *   4. Install.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

const REPO_OWNER = 'faisalBS23';
const REPO_NAME = 'testing-automation-agent';
const BRANCH = 'main';
const RAW_BASE = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}`;

// [id, label, file, description]
const TOOLS = [
  ['agent',   '.agent/ convention',          '.agent/rules/testing-rules.md',
    'JetBrains AI, Sourcegraph Cody, Windsurf, modern cross-tool agents'],
  ['claude',  'Claude Code',                 '.claude/skills/testing-rules/SKILL.md',
    'Anthropic Claude Code skill discovery'],
  ['cursor',  'Cursor',                      '.cursor/rules/testing-standards.mdc',
    'Cursor rule discovery (.mdc file)'],
  ['copilot', 'GitHub Copilot',              '.github/copilot-instructions.md',
    'GitHub Copilot workspace instructions'],
  ['puku',    'puku-cli',                    '.puku-cli/skills/testing-rules/SKILL.md',
    'puku-cli skill discovery'],
];

function parseArgs(argv) {
  const args = {
    global: false,
    help: false,
    nonInteractive: false,
    scope: null,           // 'project' | 'global'
    tools: [],             // explicit tool ids
  };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--global' || arg === '-g') args.global = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg === '--non-interactive' || arg === '-y') args.nonInteractive = true;
    else if (arg === '--scope') args.scope = argv[++i];
    else if (arg === '--tools') args.tools = argv[++i].split(',').map((s) => s.trim().toLowerCase());
  }
  return args;
}

function printHelp() {
  console.log(`testing-automation-agent — installs the SQA Playwright persona/rules.

Usage:
  npx testing-automation-agent                              # interactive picker
  npx testing-automation-agent --global                     # personal/global install
  npx testing-automation-agent --non-interactive --tools claude,cursor --scope project
  npx testing-automation-agent --help

Interactive flow:
  1. Project or Global?
  2. Which AI tools? (multi-select)
  3. Confirm?
  4. Install + show next steps.
`);
}

function download(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) return download(res.headers.location).then(resolve, reject);
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function ask(rl, question) {
  return new Promise((resolve) => rl.question(question, (answer) => resolve(answer.trim())));
}

// Interactive multi-select checklist. Returns array of selected tool ids.
async function pickTools(rl) {
  console.log('\nWhich AI tools do you want to install for?');
  console.log('Enter a comma-separated list of numbers (e.g. "1,2,4"), or "all" for everything.\n');

  TOOLS.forEach((t, i) => {
    console.log(`  [${i + 1}] ${t[1].padEnd(28)} — ${t[3]}`);
  });
  console.log(`  [all] Install all of the above`);

  while (true) {
    const ans = (await ask(rl, '\nSelect (numbers or "all"): ')).toLowerCase();
    if (ans === 'all' || ans === 'a') return TOOLS.map((t) => t[0]);
    const nums = ans.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
    if (nums.length === 0) {
      console.log('  Please enter at least one number, or "all".');
      continue;
    }
    const ids = [];
    let bad = false;
    for (const n of nums) {
      if (n < 1 || n > TOOLS.length) { console.log(`  ${n} is out of range.`); bad = true; break; }
      ids.push(TOOLS[n - 1][0]);
    }
    if (!bad) return ids;
  }
}

async function pickScope(rl) {
  console.log('\nWhere should the skill be installed?\n');
  console.log('  [1] Project (./AGENTS.md + ./.<tool>/...) — current directory only');
  console.log('  [2] Global  (' + os.homedir() + '/AGENTS.md + .../...) — follows you across all repos');
  while (true) {
    const ans = (await ask(rl, '\nChoose 1 or 2: '));
    if (ans === '1') return 'project';
    if (ans === '2') return 'global';
    console.log('  Please enter 1 or 2.');
  }
}

async function confirm(rl, message) {
  while (true) {
    const ans = (await ask(rl, message + ' (y/n): ')).toLowerCase();
    if (ans === 'y' || ans === 'yes') return true;
    if (ans === 'n' || ans === 'no') return false;
  }
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) { printHelp(); return; }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  let scope, toolIds;
  if (args.nonInteractive) {
    scope = args.scope || (args.global ? 'global' : 'project');
    toolIds = args.tools.length ? args.tools : TOOLS.map((t) => t[0]);
  } else {
    console.log('┌──────────────────────────────────────────────────────────────┐');
    console.log('│  testing-automation-agent — Senior SQA Playwright installer  │');
    console.log('└──────────────────────────────────────────────────────────────┘');

    scope = args.global ? 'global' : await pickScope(rl);
    toolIds = await pickTools(rl);

    console.log('\nSummary:');
    console.log(`  Scope : ${scope === 'global' ? 'global (' + os.homedir() + ')' : 'project (' + process.cwd() + ')'}`);
    console.log(`  Tools : ${toolIds.map((id) => TOOLS.find((t) => t[0] === id)?.[1] || id).join(', ')}`);
    const ok = await confirm(rl, '\nProceed with install?');
    if (!ok) { console.log('Cancelled.'); rl.close(); return; }
  }

  rl.close();

  const base = scope === 'global' ? os.homedir() : process.cwd();
  // Always include AGENTS.md (universal)
  const filesToInstall = ['AGENTS.md'];
  for (const id of toolIds) {
    const tool = TOOLS.find((t) => t[0] === id);
    if (tool && !filesToInstall.includes(tool[2])) filesToInstall.push(tool[2]);
  }

  console.log(`\nInstalling ${filesToInstall.length} file(s) into ${base}:`);
  let hadFailure = false;
  for (const relPath of filesToInstall) {
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
      hadFailure = true;
    }
  }

  if (hadFailure) process.exit(1);

  console.log(`\n✓ Installed to ${base}`);
  console.log(`\nNext steps:`);
  console.log(`  1. Restart your AI coding tool (Claude Code, puku-cli, Cursor, JetBrains AI, ...)`);
  console.log(`  2. Ask: "write a Playwright test for the login page"`);
  console.log(`     or explicitly: /testing-rules`);
}

main().catch((err) => { console.error(err); process.exit(1); });
