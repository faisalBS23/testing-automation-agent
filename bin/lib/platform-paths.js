'use strict';

// Scope resolution: 'project' (cwd) vs 'global' (~/.testing-rules).
// Centralizes path resolution so the rest of the installer doesn't care
// which scope is active.

const path = require('path');
const os = require('os');
const { globalHome } = require('./providers');

function projectCwd() {
  return process.cwd();
}

function resolveScopeRoot(scope) {
  return scope === 'global' ? globalHome() : projectCwd();
}

function resolveScopeTarget(scope, provider) {
  return provider.targetPath(scope);
}

module.exports = {
  projectCwd,
  resolveScopeRoot,
  resolveScopeTarget,
};
