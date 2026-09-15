[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repoRoot
npm.cmd ci
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npm.cmd test
exit $LASTEXITCODE