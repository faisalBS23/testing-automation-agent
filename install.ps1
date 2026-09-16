# Universal installer for the SQA Playwright testing agent.
# Works in Claude Code, puku-cli, Cursor, GitHub Copilot, Codex, etc.
#
# Usage:
#   .\install.ps1                          # install into current repo (.\AGENTS.md + tool mirrors)
#   .\install.ps1 -Global                  # install into $env:USERPROFILE
#   .\install.ps1 -Tools claude,puku       # only specific tool mirrors
#   .\install.ps1 -Help

param(
    [switch]$Global,
    [string]$Tools = ""
)

$Repo = "https://raw.githubusercontent.com/faisalBS23/testing-automation-agent/main"

function Print-Help {
    @"
testing-automation-agent — installs the SQA Playwright persona/rules into your repo.

Usage:
  .\install.ps1                          # project-local
  .\install.ps1 -Global                  # personal
  .\install.ps1 -Tools claude,puku       # specific tool mirrors
  .\install.ps1 -Help

After install, restart your AI coding tool and try:
  "write a Playwright test for the login page"
"@
}

if ($Help) { Print-Help; exit 0 }

if ($Global) {
    $Dest = $env:USERPROFILE
} else {
    $Dest = (Get-Location).Path
}

$Files = @("AGENTS.md")

if ([string]::IsNullOrWhiteSpace($Tools)) {
    $Files += @(
        ".agent/rules/testing-rules.md",
        ".claude/skills/testing-rules/SKILL.md",
        ".cursor/rules/testing-standards.mdc",
        ".github/copilot-instructions.md",
        ".puku-cli/skills/testing-rules/SKILL.md"
    )
} else {
    foreach ($tool in $Tools.Split(',')) {
        switch ($tool.Trim().ToLower()) {
            "agent"     { $Files += ".agent/rules/testing-rules.md" }
            "claude"    { $Files += ".claude/skills/testing-rules/SKILL.md" }
            "cursor"    { $Files += ".cursor/rules/testing-standards.mdc" }
            "copilot"   { $Files += ".github/copilot-instructions.md" }
            "puku"      { $Files += ".puku-cli/skills/testing-rules/SKILL.md" }
            "puku-cli"  { $Files += ".puku-cli/skills/testing-rules/SKILL.md" }
            default     { Write-Host "Unknown tool: $tool (skipping)" }
        }
    }
}

Write-Host "Installing $($Files.Count) file(s) into $Dest"
foreach ($rel in $Files) {
    $url = "$Repo/$rel" -replace '\\', '/'
    $fileDest = Join-Path $Dest $rel
    New-Item -ItemType Directory -Force -Path (Split-Path $fileDest) | Out-Null
    Write-Host -NoNewline "  $rel ... "
    try {
        Invoke-WebRequest -Uri $url -OutFile $fileDest -UseBasicParsing -ErrorAction Stop
        Write-Host "ok"
    } catch {
        Write-Host "FAIL ($($_.Exception.Message))"
        exit 1
    }
}

Write-Host ""
Write-Host "Installed to $Dest"
Write-Host "Next: restart your AI tool and try: 'write a Playwright test for the login page'"
