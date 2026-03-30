param(
  [string]$NodeRoot = 'C:\DATA\nodejs'
)

$ErrorActionPreference = 'Stop'

$nodeExe = Join-Path $NodeRoot 'node.exe'
$npmCli = Join-Path $NodeRoot 'node_modules\npm\bin\npm-cli.js'

if (-not (Test-Path $nodeExe)) {
  throw "node.exe not found at $nodeExe. Install Node in C:\\DATA\\nodejs or pass -NodeRoot."
}

if (-not (Test-Path $npmCli)) {
  throw "npm-cli.js not found at $npmCli."
}

$env:Path = "$NodeRoot;$env:Path"

Push-Location $PSScriptRoot
try {
  & $nodeExe $npmCli install
  & $nodeExe $npmCli run build
}
finally {
  Pop-Location
}
