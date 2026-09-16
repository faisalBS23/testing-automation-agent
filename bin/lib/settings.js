'use strict';

// stdlib-only helpers for file IO and remote fetch.
// Zero npm runtime deps.

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { URL } = require('url');

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function fileExists(p) {
  try {
    fs.accessSync(p, fs.constants.R_OK);
    return true;
  } catch (_) {
    return false;
  }
}

function readFile(p) {
  return fs.readFileSync(p, 'utf8');
}

function writeFile(p, content) {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, content, 'utf8');
}

function backupFile(p) {
  if (!fileExists(p)) return null;
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const bak = `${p}.bak-${ts}`;
  fs.copyFileSync(p, bak);
  return bak;
}

// Minimal JSONC-tolerant reader. Strips // line comments and /* */ block
// comments. Not a full parser — only safe for our manifest and settings files.
function readJSONC(p) {
  const raw = readFile(p);
  const stripped = raw
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
  return JSON.parse(stripped);
}

function fetchText(url, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.get(u, { timeout: timeoutMs }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // follow one redirect
        fetchText(res.headers.location, timeoutMs).then(resolve, reject);
        return;
      }
      if (res.statusCode && res.statusCode >= 400) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      let buf = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { buf += chunk; });
      res.on('end', () => resolve(buf));
    });
    req.on('timeout', () => req.destroy(new Error(`timeout after ${timeoutMs}ms: ${url}`)));
    req.on('error', reject);
  });
}

module.exports = {
  ensureDir,
  fileExists,
  readFile,
  writeFile,
  backupFile,
  readJSONC,
  fetchText,
};
