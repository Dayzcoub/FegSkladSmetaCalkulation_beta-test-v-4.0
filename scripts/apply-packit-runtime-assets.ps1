param(
  [string]$ZipPath = "PACKIT_runtime_assets_ready_v1.zip",
  [switch]$Force
)

$ErrorActionPreference = "Stop"

function Write-Step($Message) {
  Write-Host "[PACK.IT assets] $Message" -ForegroundColor Cyan
}

$root = Split-Path -Parent $PSScriptRoot
if (-not $root) {
  throw "Cannot resolve project root. Run this script from the repository scripts folder."
}

Set-Location $root

if (-not (Test-Path $ZipPath)) {
  throw "Runtime assets archive not found: $ZipPath. Put PACKIT_runtime_assets_ready_v1.zip into the repository root or pass -ZipPath <path>."
}

$tempDir = Join-Path $env:TEMP ("packit-runtime-assets-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tempDir | Out-Null

try {
  Write-Step "Extracting $ZipPath"
  Expand-Archive -Path $ZipPath -DestinationPath $tempDir -Force

  $publicSource = Join-Path $tempDir "public"
  $docsSource = Join-Path $tempDir "docs"

  if (-not (Test-Path $publicSource)) {
    throw "Archive does not contain public/ folder. Wrong archive?"
  }

  $publicTarget = Join-Path $root "public"
  $docsTarget = Join-Path $root "docs"

  if (-not (Test-Path $publicTarget)) {
    New-Item -ItemType Directory -Path $publicTarget | Out-Null
  }
  if (-not (Test-Path $docsTarget)) {
    New-Item -ItemType Directory -Path $docsTarget | Out-Null
  }

  Write-Step "Copying public/assets/packit"
  Copy-Item -Path (Join-Path $publicSource "*") -Destination $publicTarget -Recurse -Force:$Force

  if (Test-Path $docsSource) {
    Write-Step "Copying docs manifests"
    Copy-Item -Path (Join-Path $docsSource "*") -Destination $docsTarget -Recurse -Force:$Force
  }

  $assetCount = 0
  $assetRoot = Join-Path $root "public/assets/packit"
  if (Test-Path $assetRoot) {
    $assetCount = (Get-ChildItem $assetRoot -File -Recurse | Measure-Object).Count
  }

  Write-Step "Done. Runtime asset files under public/assets/packit: $assetCount"
  Write-Host "Next: git status" -ForegroundColor Yellow
  Write-Host "Then commit files only, without UI logic changes." -ForegroundColor Yellow
}
finally {
  if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
  }
}
