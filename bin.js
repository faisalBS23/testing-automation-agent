#!/usr/bin/env node
/**
 * testing-automation-agent CLI
 *
 * Usage:
 *   npx testing-automation-agent           # install into the current repo
 *   npx testing-automation-agent --global  # install into ~/.puku-cli/skills/ (cross-repo)
 *   npx testing-automation-agent --help
 *
 * What it does:
 *   Downloads SKILL.md from the GitHub repo and drops it into the user's
 *   .puku-cli/skills/testing-rules/ directory. After restart of puku-cli,
 *   the agent (Senior SQA persona) auto-invokes on Playwright test requests.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

const REPO_OWNER = 'faisalBS23';
const REPO_NAME = 'testing-automation-agent';
const BRANCH = 'main';
const SKILL_URL = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/.puku-cli/skills/testing-rules/SKILL.md`;
const SKILL_REL_PATH = path.join('.puku-cli', 'skills', 'testing-rules', 'SKILL.md');

function parseArgs(argv) {
  const args = { global: false, help: false };
  for (const arg of argv.slice(2)) {
    if (arg === '--global' || arg === '-g') args.global = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
  }
  return args;
}

function printHelp() {
  console.log(`testing-automation-agent — installs the SQA Playwright skill into your repo.

Usage:
  npx testing-automation-agent           # project-local: ./${SKILL_REL_PATH}
  npx testing-automation-agent --global  # personal: ~/.puku-cli/skills/testing-rules/SKILL.md
  npx testing-automation-agent --help

After install, restart puku-cli and ask: "write a Playwright test for the login page"
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

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const dest = args.global
    ? path.join(os.homedir(), '.puku-cli', 'skills', 'testing-rules', 'SKILL.md')
    : path.join(process.cwd(), SKILL_REL_PATH);

  console.log(`Downloading skill from ${SKILL_URL} ...`);
  let skillContent;
  try {
    skillContent = await download(SKILL_URL);
  } catch (err) {
    console.error(`Failed to download SKILL.md: ${err.message}`);
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, skillContent, 'utf8');

  console.log(`Installed to ${dest}`);
  console.log(`\nNext steps:`);
  console.log(`  1. Restart puku-cli (if it's running)`);
  console.log(`  2. Try: "write a Playwright test for the login page"`);
  console.log(`     or: /testing-rules`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
