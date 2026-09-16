# Install the SQA automation agent skill into the current repo (or your home).
# Usage:
#   .\install.ps1           # install into current repo (.puku-cli/skills/testing-rules/)
#   .\install.ps1 -Global   # install into $env:USERPROFILE\.puku-cli\skills\testing-rules\
param(
    [switch]$Global
)

$Repo = "https://raw.githubusercontent.com/faisalBS23/testing-automation-agent/main/.puku-cli/skills/testing-rules/SKILL.md"

if ($Global) {
    $Dest = Join-Path $env:USERPROFILE ".puku-cli\skills\testing-rules\SKILL.md"
} else {
    $Dest = Join-Path (Get-Location) ".puku-cli\skills\testing-rules\SKILL.md"
}

New-Item -ItemType Directory -Force -Path (Split-Path $Dest) | Out-Null
Invoke-WebRequest -Uri $Repo -OutFile $Dest -UseBasicParsing

Write-Host "Installed to $Dest"
Write-Host "Restart puku-cli and try: 'write a Playwright test for the login page'"
