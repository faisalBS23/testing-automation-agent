'use strict';

// File-ownership installer.
// Two modes:
//   - 'merge-marker' (AGENTS.md): wraps the new content in HTML comment markers,
//     replaces existing block if present, appends if absent. Idempotent.
//   - 'skip-on-exist' (all other files): writes once, skips if file exists.
//        use --force to overwrite.
//
// Tracks installed files in a manifest JSON for clean uninstall.

const fs = require('fs');
const path = require('path');

const { PROVIDERS, resolveSourceFile } = require('./providers');
const { fileExists, readFile, writeFile, fetchText, ensureDir } = require('./settings');

const MARKER_PREFIX = 'testing-rules';

function startMarker(id) { return `<!-- ${MARKER_PREFIX}:${id}:start -->`; }
function endMarker(id)   { return `<!-- ${MARKER_PREFIX}:${id}:end -->`; }

function buildBlock(provider) {
  return `${startMarker(provider.id)}\n${provider.sourceFile ? '' : ''}<!-- testing-rules:${provider.id} — managed by testing-automation-agent. Edit outside this block to keep it after an update. -->\n`;
}

// Read remote source file (from raw.githubusercontent).
async function fetchSource(provider) {
  const url = resolveSourceFile(provider);
  return fetchText(url);
}

// merge-marker mode: idempotent append-or-replace.
function mergeMarkerBlock(targetPath, provider, sourceText) {
  ensureDir(path.dirname(targetPath));
  const start = startMarker(provider.id);
  const end = endMarker(provider.id);

  let existing = '';
  if (fileExists(targetPath)) existing = readFile(targetPath);

  // Normalize trailing whitespace so re-runs don't grow the file.
  const trimmedExisting = existing.replace(/\n{3,}/g, '\n\n').trimEnd();
  const normalizedSource = String(sourceText).replace(/\n{3,}/g, '\n\n').trimEnd();

  const block = `${start}\n<!-- testing-rules:${provider.id} — managed by testing-automation-agent. Edits outside this block survive updates. -->\n${normalizedSource}\n${end}`;

  let next;
  if (trimmedExisting.includes(start) && trimmedExisting.includes(end)) {
    // Replace existing block.
    const re = new RegExp(`${escapeRe(start)}[\\s\\S]*?${escapeRe(end)}`, 'm');
    next = trimmedExisting.replace(re, block);
  } else {
    // Append to existing content (or create new file).
    const sep = trimmedExisting.length === 0 ? '' : '\n\n';
    next = `${trimmedExisting}${sep}${block}\n`;
  }

  const finalContent = `${next.trimEnd()}\n`;
  if (fileExists(targetPath) && readFile(targetPath) === finalContent) {
    return { action: 'unchanged', targetPath, content: finalContent };
  }
  writeFile(targetPath, finalContent);
  return { action: 'wrote', targetPath, content: finalContent };
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// skip-on-exist mode: write once unless --force.
function writeIfMissing(targetPath, sourceText, { force = false } = {}) {
  ensureDir(path.dirname(targetPath));
  const normalized = String(sourceText).replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
  if (fileExists(targetPath)) {
    if (!force) {
      return { action: 'skipped', targetPath, content: null };
    }
    writeFile(targetPath, normalized);
    return { action: 'wrote', targetPath, content: normalized };
  }
  writeFile(targetPath, normalized);
  return { action: 'wrote', targetPath, content: normalized };
}

// High-level orchestration for one provider.
async function installProvider(provider, scope, { force = false, dryRun = false } = {}) {
  const targetPath = provider.targetPath(scope);
  const result = {
    id: provider.id,
    label: provider.label,
    targetPath,
    mode: provider.mode,
    action: null,
    error: null,
  };

  if (dryRun) {
    result.action = fileExists(targetPath) && provider.mode === 'skip-on-exist' && !force
      ? 'would-skip'
      : 'would-write';
    return result;
  }

  try {
    const sourceText = await fetchSource(provider);
    if (provider.mode === 'merge-marker') {
      const r = mergeMarkerBlock(targetPath, provider, sourceText);
      result.action = r.action;
    } else {
      const r = writeIfMissing(targetPath, sourceText, { force });
      result.action = r.action;
    }
  } catch (err) {
    result.error = err.message || String(err);
    result.action = 'failed';
  }

  return result;
}

// Manifest tracking for clean uninstall.
function manifestPath(scope) {
  const base = scope === 'global' ? require('./providers').globalHome() : process.cwd();
  return path.join(base, '.testing-rules-manifest.json');
}

function recordInstall(scope, provider) {
  const mf = manifestPath(scope);
  let m = { scope, installed: {} };
  if (fileExists(mf)) {
    try { m = JSON.parse(readFile(mf)); } catch (_) { /* fresh manifest */ }
  }
  m.installed = m.installed || {};
  m.installed[provider.id] = {
    targetPath: provider.targetPath(scope),
    mode: provider.mode,
    installedAt: new Date().toISOString(),
  };
  writeFile(mf, JSON.stringify(m, null, 2) + '\n');
}

function clearManifestEntry(scope, providerId) {
  const mf = manifestPath(scope);
  if (!fileExists(mf)) return;
  try {
    const m = JSON.parse(readFile(mf));
    if (m.installed && m.installed[providerId]) {
      delete m.installed[providerId];
      writeFile(mf, JSON.stringify(m, null, 2) + '\n');
    }
  } catch (_) { /* ignore */ }
}

function readManifest(scope) {
  const mf = manifestPath(scope);
  if (!fileExists(mf)) return null;
  try { return JSON.parse(readFile(mf)); } catch (_) { return null; }
}

// Uninstall: for merge-marker providers, strip the marker block. For
// skip-on-exist, delete the file (but only if it looks like ours).
async function uninstallProvider(provider, scope, { force = false, dryRun = false } = {}) {
  const targetPath = provider.targetPath(scope);
  const result = {
    id: provider.id,
    label: provider.label,
    targetPath,
    action: null,
    error: null,
  };

  if (!fileExists(targetPath)) {
    result.action = 'absent';
    return result;
  }

  if (dryRun) {
    result.action = 'would-remove';
    return result;
  }

  try {
    if (provider.mode === 'merge-marker') {
      const start = startMarker(provider.id);
      const end = endMarker(provider.id);
      const existing = readFile(targetPath);
      if (existing.includes(start) && existing.includes(end)) {
        const re = new RegExp(`\\n*${escapeRe(start)}[\\s\\S]*?${escapeRe(end)}\\n*`, 'm');
        const next = existing.replace(re, '\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
        writeFile(targetPath, next);
        result.action = 'stripped';
      } else {
        result.action = 'no-marker-found';
      }
    } else {
      if (force) {
        fs.unlinkSync(targetPath);
        result.action = 'deleted';
      } else {
        // Refuse to delete foreign files unless --force.
        result.action = 'skipped-foreign';
      }
    }
    clearManifestEntry(scope, provider.id);
  } catch (err) {
    result.error = err.message || String(err);
    result.action = 'failed';
  }
  return result;
}

module.exports = {
  MARKER_PREFIX,
  startMarker,
  endMarker,
  mergeMarkerBlock,
  writeIfMissing,
  fetchSource,
  installProvider,
  uninstallProvider,
  manifestPath,
  recordInstall,
  readManifest,
};
