#!/usr/bin/env node
// testing-rules — single Node installer.
// Mirrors caveman's bin/install.js structure: pure stdlib, zero npm deps.
// Run via install.sh / install.ps1 shims or directly:
//   node bin/install.js [flags]
//   npx -y github:faisalBS23/testing-automation-agent [flags]

'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const { PROVIDERS, getRef, globalHome } = require('./lib/providers');
const { installProvider, uninstallProvider, recordInstall, manifestPath, readManifest } = require('./lib/owned-install');
const { resolveScopeRoot } = require('./lib/platform-paths');

// ── Color ──────────────────────────────────────────────────────────────────
const useColor = !process.argv.includes('--no-color') && process.stdout.isTTY && !process.env.NO_COLOR;
const c = (codes, s) => useColor ? `\x1b[${codes}m${s}\x1b[0m` : s;
const orange = (s) => c('38;5;172', s);
const dim    = (s) => c('2', s);
const green  = (s) => c('32', s);
const yellow = (s) => c('33', s);
const red    = (s) => c('31', s);
const bold   = (s) => c('1', s);

// ── Version ────────────────────────────────────────────────────────────────
const PKG = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));

// ── Argv ───────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const opts = {
    dryRun: false,
    force: false,
    list: false,
    help: false,
    version: false,
    uninstall: false,
    nonInteractive: false,
    noColor: false,
    global: false,
    scope: null,
    all: false,
    minimal: false,
    only: [],
    tools: [],
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--dry-run':       opts.dryRun = true; break;
      case '--force':         opts.force = true; break;
      case '--list':          opts.list = true; break;
      case '--help': case '-h': opts.help = true; break;
      case '--version': case '-V': opts.version = true; break;
      case '--uninstall': case '-u': opts.uninstall = true; break;
      case '--non-interactive': case '-y': opts.nonInteractive = true; break;
      case '--no-color':      opts.noColor = true; break;
      case '--global': case '-g': opts.global = true; break;
      case '--all':           opts.all = true; break;
      case '--minimal':       opts.minimal = true; break;
      case '--scope':         opts.scope = argv[++i]; break;
      case '--only':          opts.only.push(argv[++i]); break;
      case '--tools':         opts.tools = String(argv[++i] || '').split(',').filter(Boolean); break;
      case '--':              break;
      default:
        if (a.startsWith('--')) {
          die(`error: unknown flag: ${a}\n  run 'testing-rules --help' for usage`);
        }
    }
  }
  if (opts.all && opts.minimal) die('error: --all and --minimal are mutually exclusive');
  if (opts.only.length && opts.tools.length) die('error: --only and --tools are mutually exclusive');
  return opts;
}

function die(msg) {
  process.stderr.write(msg + '\n');
  process.exit(2);
}

// ── Banner ─────────────────────────────────────────────────────────────────
function banner() {
  const lines = [
    '╔══════════════════════════════════════════════════════════╗',
    '║   testing-rules — Senior SQA Automation Engineer agent  ║',
    '║   one install. role-based locators. POM. never FE.       ║',
    '╚══════════════════════════════════════════════════════════╝',
  ];
  console.log(lines.map(orange).join('\n'));
  console.log(dim(`  v${PKG.version} · ref ${getRef()} · node ${process.version}\n`));
}

// ── Help ───────────────────────────────────────────────────────────────────
function printHelp() {
  console.log(`${bold('testing-rules')} — install Playwright testing standards for AI coding agents

${bold('Usage')}
  testing-rules [flags]
  testing-rules install [flags]
  testing-rules -u [flags]

${bold('Flags')}
  --all                  Install all providers (default if --tools/--only omitted and non-interactive)
  --minimal              Install only the universal AGENTS.md provider
  --only <id>            Install only the named provider (repeatable)
  --tools <id,id,...>    Install the named providers (csv)
  --scope <project|global>
                         Where to install (default: project)
  --global, -g           Alias for --scope global
  --dry-run              Print what would be written, write nothing
  --force                Overwrite skip-on-exist files
  --uninstall, -u        Remove installed files / marker blocks
  --non-interactive, -y  Skip interactive picker (CI/no-TTY)
  --list                 Print provider matrix, exit
  --version, -V          Print version, exit
  --help, -h             This help
  --no-color             Strip ANSI colors

${bold('Providers')}
  ${PROVIDERS.map(p => p.id).join(', ')}

${bold('Examples')}
  testing-rules --all
  testing-rules --only claude --global
  testing-rules --dry-run --all
  testing-rules -u --only agents
`);
}

// ── List ───────────────────────────────────────────────────────────────────
function printList() {
  console.log(bold('Supported providers'));
  console.log();
  for (const p of PROVIDERS) {
    console.log(`  ${orange(p.id.padEnd(12))} ${p.label}`);
    console.log(`  ${dim('             ' + p.description)}`);
    console.log(`  ${dim('             ' + p.mode)}`);
    console.log();
  }
}

// ── Interactive picker ──────────────────────────────────────────────────────
function ask(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function pickScope() {
  if (!process.stdin.isTTY) return 'project';
  console.log(yellow('\nWhere to install?'));
  console.log('  1) project  (current directory — recommended)');
  console.log('  2) global   (~/.testing-rules/)');
  const ans = (await ask('\nChoice [1/2]: ')).trim();
  return ans === '2' ? 'global' : 'project';
}

async function pickProviders() {
  if (!process.stdin.isTTY) return ['agents'];
  console.log(yellow('\nWhich providers? (comma-separated numbers, or "all")'));
  PROVIDERS.forEach((p, i) => {
    console.log(`  ${i + 1}) ${p.id.padEnd(12)} — ${p.label}`);
  });
  const ans = (await ask('\nChoice [all]: ')).trim();
  if (!ans || /^all$/i.test(ans)) return PROVIDERS.map(p => p.id);
  const ids = [];
  for (const tok of ans.split(',').map(s => s.trim()).filter(Boolean)) {
    const idx = parseInt(tok, 10);
    if (Number.isFinite(idx) && idx >= 1 && idx <= PROVIDERS.length) {
      ids.push(PROVIDERS[idx - 1].id);
    } else if (PROVIDERS.find(p => p.id === tok)) {
      ids.push(tok);
    }
  }
  return ids.length ? ids : ['agents'];
}

// ── Resolve scope + providers from flags ───────────────────────────────────
async function resolveScope(opts) {
  if (opts.scope === 'project' || opts.scope === 'global') return opts.scope;
  if (opts.global) return 'global';
  if (opts.nonInteractive || !process.stdin.isTTY) return 'project';
  return pickScope();
}

async function resolveProviders(opts) {
  if (opts.all) return PROVIDERS.map(p => p.id);
  if (opts.minimal) return ['agents'];
  if (opts.only.length) {
    for (const id of opts.only) {
      if (!PROVIDERS.find(p => p.id === id)) {
        die(`error: unknown provider: ${id}\n  run 'testing-rules --list' for valid ids`);
      }
    }
    return [...opts.only];
  }
  if (opts.tools.length) {
    for (const id of opts.tools) {
      if (!PROVIDERS.find(p => p.id === id)) {
        die(`error: unknown provider: ${id}\n  run 'testing-rules --list' for valid ids`);
      }
    }
    return [...opts.tools];
  }
  if (opts.nonInteractive || !process.stdin.isTTY) return ['agents'];
  return pickProviders();
}

// ── Summary printer ─────────────────────────────────────────────────────────
function summarize(results, verb) {
  const groups = { wrote: 0, skipped: 0, failed: 0, unchanged: 0, 'would-write': 0, 'would-skip': 0, 'would-remove': 0, stripped: 0, deleted: 0, 'absent': 0, 'no-marker-found': 0, 'skipped-foreign': 0 };
  for (const r of results) groups[r.action] = (groups[r.action] || 0) + 1;

  console.log();
  for (const r of results) {
    const status =
      r.action === 'wrote' || r.action === 'stripped' || r.action === 'deleted' ? green('✓ ' + r.action) :
      r.action === 'skipped' || r.action === 'unchanged' || r.action === 'absent' || r.action === 'no-marker-found' || r.action === 'skipped-foreign' ? dim('· ' + r.action) :
      r.action === 'failed' ? red('✗ failed') :
      yellow('~ ' + r.action);
    console.log(`  ${status.padEnd(20)} ${r.id.padEnd(12)} ${dim(r.targetPath)}`);
    if (r.error) console.log(`    ${red(r.error)}`);
  }

  console.log();
  console.log(bold(`${verb} summary`) + dim(`  wrote=${groups.wrote}  skipped=${groups.skipped || 0}  unchanged=${groups.unchanged || 0}  failed=${groups.failed || 0}`));
  if (groups.failed) process.exit(1);
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.help)    { printHelp(); return; }
  if (opts.version) { console.log(`testing-rules v${PKG.version}`); return; }
  if (opts.list)    { printList(); return; }

  if (!opts.uninstall) banner();

  const scope = await resolveScope(opts);
  const providers = await resolveProviders(opts);
  const root = resolveScopeRoot(scope);

  if (opts.uninstall) {
    if (!opts.dryRun) console.log(yellow(`\nUninstalling from ${scope}: ${root}`));
    const results = [];
    for (const id of providers) {
      const p = PROVIDERS.find(x => x.id === id);
      if (!p) continue;
      results.push(await uninstallProvider(p, scope, { force: opts.force, dryRun: opts.dryRun }));
    }
    summarize(results, 'Uninstall');
    return;
  }

  console.log(yellow(`\nInstalling to ${scope}: ${root}`));
  console.log(dim(`Providers: ${providers.join(', ')}`));
  if (opts.dryRun) console.log(dim('DRY RUN — no files will be written'));

  const results = [];
  for (const id of providers) {
    const p = PROVIDERS.find(x => x.id === id);
    if (!p) continue;
    const r = await installProvider(p, scope, { force: opts.force, dryRun: opts.dryRun });
    results.push(r);
    if (r.action === 'wrote' && !opts.dryRun) recordInstall(scope, p);
  }
  summarize(results, 'Install');

  if (!opts.dryRun && results.some(r => r.action === 'wrote')) {
    console.log();
    console.log(green('Done.') + dim(' Reload your AI agent to pick up the new rules.'));
  }
}

main().catch((err) => {
  console.error(red('error: ') + (err.message || String(err)));
  process.exit(1);
});
