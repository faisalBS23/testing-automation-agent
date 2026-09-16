#!/usr/bin/env node
/**
 * testing-automation-agent — universal interactive installer.
 *
 * One-command install for the Senior SQA Playwright testing persona/rules,
 * for any AI coding tool (Claude Code, puku-cli, Cursor, GitHub Copilot,
 * JetBrains AI Assistant, Sourcegraph Cody, Windsurf, ...).
 *
 * Conflict handling:
 *   - AGENTS.md: append/replace a `<!-- testing-rules:start/end -->` marker
 *     block. Preserves the user's existing content outside the markers.
 *     Idempotent — re-running replaces only the marker block.
 *   - Tool-specific files (SKILL.md, .mdc, copilot-instructions.md, .agent/...):
 *     SKIP if the file already exists locally. The user can delete it to
 *     re-trigger a write.
 *
 * Usage:
 *   npx -y github:faisalBS23/testing-automation-agent
 *   npx -y github:faisalBS23/testing-automation-agent --global
 *   npx -y github:faisalBS23/testing-automation-agent --non-interactive --tools claude,cursor --scope project
 *   npx -y github:faisalBS23/testing-automation-agent --help
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
const TEMPLATES_BASE = `${RAW_BASE}/templates`;

const MARKER_START = '<!-- testing-rules:start -->';
const MARKER_END = '<!-- testing-rules:end -->';

// [id, label, localPath (in user's repo), templatePath (in our repo), description]
// For AGENTS.md we use a special marker-based merge. Others use skip-if-exists.
const TOOLS = [
  ['agents',  'AGENTS.md (universal)',      'AGENTS.md',
    `${TEMPLATES_BASE}/AGENTS.md`,
    'Universal — every AI tool reads this (Claude Code, Cursor, Codex, Copilot, ...)'],

  ['agent',   '.agent/ convention',          '.agent/rules/testing-rules.md',
    `${TEMPLATES_BASE}/agent-rule.md`,
    'JetBrains AI, Sourcegraph Cody, Windsurf'],

  ['claude',  'Claude Code',                 '.claude/skills/testing-rules/SKILL.md',
    `${TEMPLATES_BASE}/claude-SKILL.md`,
    'Anthropic Claude Code skill discovery'],

  ['cursor',  'Cursor',                      '.cursor/rules/testing-standards.mdc',
    `${TEMPLATES_BASE}/cursor-rule.mdc`,
    'Cursor rule discovery'],

  ['copilot', 'GitHub Copilot',              '.github/copilot-instructions.md',
    `${TEMPLATES_BASE}/copilot-instructions.md`,
    'GitHub Copilot workspace instructions'],

  ['puku',    'puku-cli',                    '.puku-cli/skills/testing-rules/SKILL.md',
    `${TEMPLATES_BASE}/puku-SKILL.md`,
    'puku-cli skill discovery'],
];

function parseArgs(argv) {
  const args = {
    global: false,
    help: false,
    nonInteractive: false,
    scope: null,
    tools: [],
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

Conflict handling:
  - AGENTS.md         appended/merged under marker comments, never overwritten
  - Other tool files  skipped if they already exist (delete to re-install)

Supported tools (auto-detected unless --tools is passed):
  agents    AGENTS.md (universal — every AI tool)
  agent     .agent/ convention (JetBrains AI, Sourcegraph Cody, Windsurf)
  claude    Claude Code skill
  cursor    Cursor rule
  copilot   GitHub Copilot instructions
  puku      puku-cli skill
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

async function pickTools(rl) {
  console.log('\nWhich AI tools do you want to install for?');
  console.log('Enter a comma-separated list of numbers (e.g. "1,2,4"), or "all".\n');

  TOOLS.forEach((t, i) => {
    console.log(`  [${i + 1}] ${t[1].padEnd(28)} — ${t[4]}`);
  });
  console.log(`  [all] Install all of the above`);

  while (true) {
    const ans = (await ask(rl, '\nSelect (numbers or "all"): ')).toLowerCase();
    if (ans === 'all' || ans === 'a') return TOOLS.map((t) => t[0]);
    const nums = ans.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
    if (nums.length === 0) { console.log('  Please enter at least one number, or "all".'); continue; }
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
  console.log('  [1] Project — current directory only');
  console.log('  [2] Global  — ' + os.homedir() + ' (follows you across all repos)');
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

/**
 * Merge a block of content into an existing file, replacing any previous
 * marker-block and preserving content outside the markers.
 *
 * Returns the new file content. Idempotent: calling mergeMarkerBlock twice
 * with the same newBlock returns the same string.
 */
function mergeMarkerBlock(existing, newBlock) {
  const block = `\n${MARKER_START}\n${newBlock.trimEnd()}\n${MARKER_END}\n`;
  const re = new RegExp(`\\n?${escapeRegExp(MARKER_START)}[\\s\\S]*?${escapeRegExp(MARKER_END)}\\n?`, 'g');
  if (re.test(existing)) {
    // Replace any existing marker block (consume leading \n so we don't double up).
    // Then ensure exactly one \n before the new block.
    return existing.replace(re, '\n' + block.trimEnd() + '\n').replace(/\n{3,}/g, '\n\n');
  }
  // No existing marker block — append with exactly one blank line separator.
  const head = existing.endsWith('\n') ? existing : existing + '\n';
  return head + '\n' + block.trimEnd() + '\n';
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function installFile({ base, localPath, templateUrl, isAgents, rl }) {
  const dest = path.join(base, localPath);
  const exists = fs.existsSync(dest);

  // Tool-specific files: skip if already exists (user can delete to re-install)
  if (!isAgents && exists) {
    return { status: 'skip', reason: 'already exists (delete to re-install)', dest };
  }

  // Fetch the template content from GitHub
  let templateContent;
  try {
    templateContent = await download(templateUrl);
  } catch (err) {
    return { status: 'fail', reason: err.message, dest };
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });

  if (isAgents) {
    if (exists) {
      const existing = fs.readFileSync(dest, 'utf8');
      const merged = mergeMarkerBlock(existing, templateContent);
      if (merged === existing) return { status: 'unchanged', dest };
      fs.writeFileSync(dest, merged, 'utf8');
      return { status: 'merged', dest };
    } else {
      // No existing AGENTS.md — create one with the marker block
      const wrapped = `\n${MARKER_START}\n${templateContent.trimEnd()}\n${MARKER_END}\n`;
      fs.writeFileSync(dest, wrapped, 'utf8');
      return { status: 'created', dest };
    }
  } else {
    fs.writeFileSync(dest, templateContent, 'utf8');
    return { status: 'created', dest };
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
    console.log('\nExisting files are preserved: AGENTS.md is merged under markers,');
    console.log('tool-specific files are skipped if they already exist.\n');

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

  console.log(`\nInstalling into ${base}:`);
  let hadFailure = false;
  let created = 0, merged = 0, skipped = 0, unchanged = 0;

  for (const id of toolIds) {
    const tool = TOOLS.find((t) => t[0] === id);
    if (!tool) { console.log(`  [${id}] unknown tool — skipped`); continue; }
    const isAgents = tool[0] === 'agents';
    const result = await installFile({
      base,
      localPath: tool[2],
      templateUrl: tool[3],
      isAgents,
      rl: null,
    });

    const label = `  ${tool[2].padEnd(48)}`;
    if (result.status === 'created')   { console.log(`${label} created`); created++; }
    else if (result.status === 'merged'){ console.log(`${label} merged (AGENTS.md marker block)`); merged++; }
    else if (result.status === 'unchanged'){ console.log(`${label} unchanged (already up to date)`); unchanged++; }
    else if (result.status === 'skip') { console.log(`${label} skipped (${result.reason})`); skipped++; }
    else if (result.status === 'fail') { console.log(`${label} FAIL (${result.reason})`); hadFailure = true; }
  }

  console.log(`\nSummary: ${created} created, ${merged} merged, ${skipped} skipped, ${unchanged} unchanged`);
  if (hadFailure) process.exit(1);

  console.log(`\n✓ Done.`);
  console.log(`\nNext steps:`);
  console.log(`  1. Restart your AI coding tool (Claude Code, puku-cli, Cursor, JetBrains AI, ...)`);
  console.log(`  2. Ask: "write a Playwright test for the login page"`);
  console.log(`     or explicitly: /testing-rules`);
}

main().catch((err) => { console.error(err); process.exit(1); });
