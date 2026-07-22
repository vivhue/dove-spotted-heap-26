$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot

node scripts/start-all.mjs
