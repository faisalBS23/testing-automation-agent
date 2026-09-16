# Universal interactive installer — Senior SQA Playwright testing agent.
# Works in Claude Code, puku-cli, Cursor, GitHub Copilot, JetBrains AI,
# Sourcegraph Cody, Windsurf, and any tool that reads AGENTS.md.
#
# Usage:
#   .\install.ps1                                       # interactive
#   .\install.ps1 -Global                               # global install
#   .\install.ps1 -NonInteractive -Tools claude,cursor -Scope project
#   .\install.ps1 -Help

param(
    [switch]$Global,
    [switch]$NonInteractive,
    [switch]$Help,
    [string]$Scope = "",
    [string]$Tools = ""
)

$Repo = "https://raw.githubusercontent.com/faisalBS23/testing-automation-agent/main"

# [id, label, file, description]
$ToolList = @(
    @{ Id = "agent";   Label = ".agent/ convention";          File = ".agent/rules/testing-rules.md";               Desc = "JetBrains AI, Sourcegraph Cody, Windsurf" },
    @{ Id = "claude";  Label = "Claude Code";                 File = ".claude/skills/testing-rules/SKILL.md";      Desc = "Anthropic Claude Code skill discovery" },
    @{ Id = "cursor";  Label = "Cursor";                      File = ".cursor/rules/testing-standards.mdc";        Desc = "Cursor rule discovery" },
    @{ Id = "copilot"; Label = "GitHub Copilot";              File = ".github/copilot-instructions.md";            Desc = "GitHub Copilot workspace instructions" },
    @{ Id = "puku";    Label = "puku-cli";                    File = ".puku-cli/skills/testing-rules/SKILL.md";    Desc = "puku-cli skill discovery" }
)

function Print-Help {
@"
testing-automation-agent — installs the SQA Playwright persona/rules.

Usage:
  .\install.ps1                                       # interactive picker
  .\install.ps1 -Global                               # global install
  .\install.ps1 -NonInteractive -Tools claude,cursor -Scope project
  .\install.ps1 -Help

Interactive flow:
  1. Project or Global?
  2. Which AI tools? (multi-select)
  3. Confirm? (y/n)
  4. Install.
"@
}

function Show-Banner {
    Write-Host "┌──────────────────────────────────────────────────────────────┐"
    Write-Host "│  testing-automation-agent — Senior SQA Playwright installer  │"
    Write-Host "└──────────────────────────────────────────────────────────────┘"
}

function Pick-Scope {
    Write-Host ""
    Write-Host "Where should the skill be installed?"
    Write-Host "  [1] Project — current directory only"
    Write-Host "  [2] Global  — follows you across all repos ($env:USERPROFILE)"
    while ($true) {
        $ans = (Read-Host "`nChoose 1 or 2").Trim()
        if ($ans -eq "1") { return "project" }
        if ($ans -eq "2") { return "global" }
        Write-Host "  Please enter 1 or 2."
    }
}

function Pick-Tools {
    Write-Host ""
    Write-Host "Which AI tools do you want to install for?"
    Write-Host "Enter a comma-separated list of numbers (e.g. ""1,2,4""), or ""all""."
    Write-Host ""
    for ($i = 0; $i -lt $ToolList.Count; $i++) {
        Write-Host ("  [{0}] {1,-26} — {2}" -f ($i + 1), $ToolList[$i].Label, $ToolList[$i].Desc)
    }
    Write-Host "  [all] Install all of the above"

    while ($true) {
        $ans = (Read-Host "`nSelect (numbers or 'all')").Trim().ToLower()
        if ($ans -eq "all" -or $ans -eq "a") { return $ToolList | ForEach-Object { $_.Id } }
        $nums = $ans.Split(',') | ForEach-Object { $_.Trim() } | Where-Object { $_ -match '^\d+$' }
        if (-not $nums) { Write-Host "  Please enter at least one number, or 'all'."; continue }
        $valid = $true
        $selected = @()
        foreach ($n in $nums) {
            $idx = [int]$n - 1
            if ($idx -lt 0 -or $idx -ge $ToolList.Count) {
                Write-Host "  $n is out of range."; $valid = $false; break
            }
            $selected += $ToolList[$idx].Id
        }
        if ($valid) { return $selected }
    }
}

function Confirm-YN($message) {
    while ($true) {
        $ans = (Read-Host "$message (y/n)").Trim().ToLower()
        if ($ans -eq "y" -or $ans -eq "yes") { return $true }
        if ($ans -eq "n" -or $ans -eq "no")  { return $false }
    }
}

# --- Entry ---
if ($Help) { Print-Help; exit 0 }

# Resolve scope
if ($NonInteractive) {
    $resolvedScope = if ($Scope) { $Scope } elseif ($Global) { "global" } else { "project" }
    $resolvedTools = if ($Tools) { $Tools.Split(',') | ForEach-Object { $_.Trim().ToLower() } } else { $ToolList | ForEach-Object { $_.Id } }
} else {
    Show-Banner
    if ($Scope)            { $resolvedScope = $Scope }
    elseif ($Global)       { $resolvedScope = "global" }
    else                   { $resolvedScope = Pick-Scope }
    $resolvedTools = Pick-Tools

    Write-Host ""
    Write-Host "Summary:"
    Write-Host "  Scope : $resolvedScope"
    $labels = $resolvedTools | ForEach-Object {
        ($ToolList | Where-Object { $_.Id -eq $_ }).Label
    }
    Write-Host "  Tools : $($labels -join ', ')"
    if (-not (Confirm-YN "Proceed with install?")) {
        Write-Host "Cancelled."
        exit 0
    }
}

# Destination root
$base = if ($resolvedScope -eq "global") { $env:USERPROFILE } else { (Get-Location).Path }

# Build file list (AGENTS.md always + selected tool mirrors)
$Files = @("AGENTS.md")
foreach ($id in $resolvedTools) {
    $tool = $ToolList | Where-Object { $_.Id -eq $id }
    if ($tool -and ($Files -notcontains $tool.File)) {
        $Files += $tool.File
    }
}

Write-Host ""
Write-Host "Installing $($Files.Count) file(s) into $base:"
foreach ($rel in $Files) {
    $url = "$Repo/$rel" -replace '\\', '/'
    $fileDest = Join-Path $base $rel
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
Write-Host "✓ Installed to $base"
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Restart your AI coding tool (Claude Code, puku-cli, Cursor, JetBrains AI, ...)"
Write-Host "  2. Ask: ""write a Playwright test for the login page"""
Write-Host "     or explicitly: /testing-rules"
