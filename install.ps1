# testing-rules — PowerShell installer shim.
#
# Thin wrapper around bin/install.js (the unified Node installer).
# Mirrors install.sh on macOS/Linux.
#
# One-line install (Windows PowerShell 5.1+):
#   irm https://raw.githubusercontent.com/faisalBS23/testing-automation-agent/v2.0.0/install.ps1 | iex
#
# Local clone:
#   pwsh install.ps1 [flags]

$ErrorActionPreference = 'Stop'

# Resolve own dir. $PSScriptRoot is set for file invocations; empty for piped.
$here = $null
if ($MyInvocation.MyCommand.Path) {
  $here = Split-Path -Parent $MyInvocation.MyCommand.Path
}

# Node >=18 required.
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error "testing-rules: Node.js (>=18) required. Install: https://nodejs.org/"
  exit 1
}
$nodeVersion = (node -p "process.versions.node")
$nodeMajor = [int]($nodeVersion.Split('.')[0])
if ($nodeMajor -lt 18) {
  Write-Error "testing-rules: Node $nodeVersion too old. Need >=18."
  exit 1
}

# Local clone path: exec the bundled installer directly.
if ($here -and (Test-Path (Join-Path $here 'bin/install.js'))) {
  & node (Join-Path $here 'bin/install.js') @args
  exit $LASTEXITCODE
}

# Piped path: delegate to npx at the pinned tag.
if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
  Write-Error "testing-rules: npx required (ships with Node >=18)."
  exit 1
}
$ref = if ($env:TESTING_RULES_REF) { $env:TESTING_RULES_REF } else { 'v2.0.0' }
& npx -y "github:faisalBS23/testing-automation-agent#$ref" @args
exit $LASTEXITCODE
