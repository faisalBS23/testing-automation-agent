# Universal interactive installer — Senior SQA Playwright testing agent.
# Works in Claude Code, puku-cli, Cursor, GitHub Copilot, JetBrains AI,
# Sourcegraph Cody, Windsurf, and any tool that reads AGENTS.md.
#
# Conflict handling:
#   - AGENTS.md: append/replace a `<!-- testing-rules:start/end -->` marker
#     block. Preserves the user's existing content. Idempotent on re-install.
#   - Tool-specific files (SKILL.md, .mdc, copilot-instructions.md, .agent/...):
#     SKIP if the file already exists locally.
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
$TemplatesBase = "$Repo/templates"
$MarkerStart = '<!-- testing-rules:start -->'
$MarkerEnd = '<!-- testing-rules:end -->'

$ToolList = @(
    @{ Id = "agents";  Label = "AGENTS.md (universal)";       File = "AGENTS.md";                                       Url = "$TemplatesBase/AGENTS.md";                Desc = "Universal — every AI tool" }
    @{ Id = "agent";   Label = ".agent/ convention";          File = ".agent/rules/testing-rules.md";                   Url = "$TemplatesBase/agent-rule.md";            Desc = "JetBrains AI, Sourcegraph Cody, Windsurf" }
    @{ Id = "claude";  Label = "Claude Code";                 File = ".claude/skills/testing-rules/SKILL.md";           Url = "$TemplatesBase/claude-SKILL.md";          Desc = "Anthropic Claude Code" }
    @{ Id = "cursor";  Label = "Cursor";                      File = ".cursor/rules/testing-standards.mdc";             Url = "$TemplatesBase/cursor-rule.mdc";          Desc = "Cursor rule" }
    @{ Id = "copilot"; Label = "GitHub Copilot";              File = ".github/copilot-instructions.md";                 Url = "$TemplatesBase/copilot-instructions.md";  Desc = "GitHub Copilot" }
    @{ Id = "puku";    Label = "puku-cli";                    File = ".puku-cli/skills/testing-rules/SKILL.md";         Url = "$TemplatesBase/puku-SKILL.md";            Desc = "puku-cli skill" }
)

function Print-Help {
@"
testing-automation-agent — installs the SQA Playwright persona/rules.

Usage:
  .\install.ps1                                       # interactive picker
  .\install.ps1 -Global                               # global install
  .\install.ps1 -NonInteractive -Tools claude,cursor -Scope project
  .\install.ps1 -Help

Conflict handling:
  - AGENTS.md         appended/merged under marker comments
  - Other tool files  skipped if they already exist (delete to re-install)

Supported tools:
  agents    AGENTS.md (universal — every AI tool)
  agent     .agent/ convention
  claude    Claude Code skill
  cursor    Cursor rule
  copilot   GitHub Copilot instructions
  puku      puku-cli skill
"@
}

function Show-Banner {
    Write-Host "┌──────────────────────────────────────────────────────────────┐"
    Write-Host "│  testing-automation-agent — Senior SQA Playwright installer  │"
    Write-Host "└──────────────────────────────────────────────────────────────┘"
    Write-Host ""
    Write-Host "Existing files are preserved: AGENTS.md is merged under markers,"
    Write-Host "tool-specific files are skipped if they already exist."
}

function Pick-Scope {
    Write-Host ""
    Write-Host "Where should the skill be installed?"
    Write-Host "  [1] Project — current directory only"
    Write-Host "  [2] Global  — $env:USERPROFILE (follows you across all repos)"
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

# Merge a new block into an existing AGENTS.md using marker comments.
# Returns the new content.
function Merge-MarkerBlock($existing, $newContent) {
    $wrappedBlock = "`n`n$MarkerStart`n$($newContent.TrimEnd())`n$MarkerEnd`n"

    if ($existing -match [regex]::Escape($MarkerStart)) {
        # Replace existing marker block (and any trailing newline)
        $pattern = "(?s)" + [regex]::Escape($MarkerStart) + ".*?" + [regex]::Escape($MarkerEnd) + "`r?`n?"
        return [regex]::Replace($existing, $pattern, $wrappedBlock.TrimStart() + "`n")
    } else {
        $sep = if ($existing -match "`n$") { "" } else { "`n`n" }
        return $existing + $sep + $wrappedBlock
    }
}

function Install-File($dest, $url, $isAgents) {
    if (-not $isAgents -and (Test-Path $dest)) {
        return @{ Status = "skipped"; Reason = "already exists (delete to re-install)" }
    }

    try {
        $content = (Invoke-WebRequest -Uri $url -UseBasicParsing -ErrorAction Stop).Content
    } catch {
        return @{ Status = "fail"; Reason = $_.Exception.Message }
    }

    New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null

    if ($isAgents) {
        if (Test-Path $dest) {
            $existing = Get-Content -Path $dest -Raw
            $merged = Merge-MarkerBlock $existing $content
            if ($merged -eq $existing) {
                return @{ Status = "unchanged"; Reason = "" }
            }
            Set-Content -Path $dest -Value $merged -NoNewline
            return @{ Status = "merged"; Reason = "" }
        } else {
            $wrapped = "$MarkerStart`n$($content.TrimEnd())`n$MarkerEnd`n"
            Set-Content -Path $dest -Value $wrapped -NoNewline
            return @{ Status = "created"; Reason = "" }
        }
    } else {
        Set-Content -Path $dest -Value $content -NoNewline
        return @{ Status = "created"; Reason = "" }
    }
}

# --- Entry ---
if ($Help) { Print-Help; exit 0 }

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

$base = if ($resolvedScope -eq "global") { $env:USERPROFILE } else { (Get-Location).Path }

Write-Host ""
Write-Host "Installing into $base:"

$created = 0; $merged = 0; $skipped = 0; $unchanged = 0; $failed = 0

foreach ($id in $resolvedTools) {
    $tool = $ToolList | Where-Object { $_.Id -eq $id }
    if (-not $tool) {
        Write-Host "  $id — unknown tool, skipping"
        continue
    }
    $isAgents = ($tool.Id -eq "agents")
    $dest = Join-Path $base $tool.File
    $result = Install-File -dest $dest -url $tool.Url -isAgents $isAgents

    $label = "  $($tool.File.PadRight(48))"
    switch ($result.Status) {
        "created"   { Write-Host "$label created";            $created++ }
        "merged"    { Write-Host "$label merged (AGENTS.md marker block)"; $merged++ }
        "unchanged" { Write-Host "$label unchanged";          $unchanged++ }
        "skipped"   { Write-Host "$label skipped ($($result.Reason))"; $skipped++ }
        "fail"      { Write-Host "$label FAIL ($($result.Reason))"; $failed++ }
    }
}

Write-Host ""
Write-Host "Summary: $created created, $merged merged, $skipped skipped, $unchanged unchanged"
if ($failed -gt 0) { exit 1 }

Write-Host ""
Write-Host "✓ Done."
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Restart your AI coding tool (Claude Code, puku-cli, Cursor, JetBrains AI, ...)"
Write-Host "  2. Ask: ""write a Playwright test for the login page"""
Write-Host "     or explicitly: /testing-rules"
