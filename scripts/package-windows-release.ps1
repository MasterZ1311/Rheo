# ==============================================================================
# Rheo Windows Release Packaging Script
# File: scripts/package-windows-release.ps1
# ==============================================================================

[CmdletBinding()]
param (
    [Parameter(Mandatory=$false)]
    [string]$VersionOverride = ""
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = (Resolve-Path "$ScriptDir\..").Path
$OutputDir = Join-Path $ProjectRoot "release"
$StageDir = Join-Path $env:TEMP "Rheo-Release-Stage"

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "   RHEO WINDOWS RELEASE PACKAGING PIPELINE                            " -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Determine Version
$version = $VersionOverride
if (-not $version) {
    $tauriConf = Join-Path $ProjectRoot "tauri\src-tauri\tauri.conf.json"
    if (Test-Path $tauriConf) {
        $json = Get-Content $tauriConf -Raw | ConvertFrom-Json
        $version = $json.version
    }
}
if (-not $version) {
    $version = "0.5.0"
}
Write-Host " Target Release Version: v$version" -ForegroundColor Green

# 2. Prepare Output Directories
if (Test-Path $StageDir) { Remove-Item -Path $StageDir -Recurse -Force }
New-Item -ItemType Directory -Path $StageDir -Force | Out-Null
if (-not (Test-Path $OutputDir)) { New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null }

# 3. Locate Built Binaries
$tauriExe = Join-Path $ProjectRoot "tauri\src-tauri\target\release\Rheo.exe"
if (-not (Test-Path $tauriExe)) {
    Write-Host " [WARN] $tauriExe not found! Checking fallback paths..." -ForegroundColor Yellow
}

Write-Host " Staging production release files..." -ForegroundColor Gray

# Copy Main Executable
if (Test-Path $tauriExe) {
    Copy-Item -Path $tauriExe -Destination (Join-Path $StageDir "Rheo.exe") -Force
}

# Copy Sidecars into binaries/
$stageBinaries = Join-Path $StageDir "binaries"
New-Item -ItemType Directory -Path $stageBinaries -Force | Out-Null

$srcBinaries = Join-Path $ProjectRoot "tauri\src-tauri\binaries"
if (Test-Path $srcBinaries) {
    Copy-Item -Path "$srcBinaries\*" -Destination $stageBinaries -Force
    Copy-Item -Path "$srcBinaries\*" -Destination $StageDir -Force
}

$backendDist = Join-Path $ProjectRoot "backend\dist"
if (Test-Path $backendDist) {
    Copy-Item -Path "$backendDist\*" -Destination $stageBinaries -Force
    Copy-Item -Path "$backendDist\*" -Destination $StageDir -Force
}

# Copy Scripts & Tooling
$filesToStage = @("launch.bat", "update.bat", "uninstall.bat")
foreach ($f in $filesToStage) {
    $src = Join-Path $ProjectRoot $f
    if (Test-Path $src) {
        Copy-Item -Path $src -Destination (Join-Path $StageDir $f) -Force
    }
}

# Copy Installer Engine
$stageInstaller = Join-Path $StageDir "installer"
New-Item -ItemType Directory -Path $stageInstaller -Force | Out-Null
Copy-Item -Path (Join-Path $ProjectRoot "installer\installer.ps1") -Destination (Join-Path $stageInstaller "installer.ps1") -Force
Copy-Item -Path (Join-Path $ProjectRoot "installer\config.ini") -Destination (Join-Path $stageInstaller "config.ini") -Force

# Copy Icon
$iconSrc = Join-Path $ProjectRoot "tauri\src-tauri\icons\icon.ico"
if (Test-Path $iconSrc) {
    Copy-Item -Path $iconSrc -Destination (Join-Path $StageDir "icon.ico") -Force
}

# Stamp Version
Set-Content -Path (Join-Path $StageDir "version.txt") -Value "v$version" -Encoding UTF8

# 4. Generate Production ZIP
$zipName = "Rheo-windows-x64.zip"
$versionedZipName = "Rheo-v$version-windows-x64.zip"
$zipPath = Join-Path $OutputDir $zipName
$versionedZipPath = Join-Path $OutputDir $versionedZipName

Write-Host " Compressing release package into $zipName..." -ForegroundColor Gray
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
if (Test-Path $versionedZipPath) { Remove-Item $versionedZipPath -Force }

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($StageDir, $zipPath, [System.IO.Compression.CompressionLevel]::Optimal, $false)
Copy-Item -Path $zipPath -Destination $versionedZipPath -Force

# 5. Compute SHA-256 Checksums
Write-Host " Computing SHA-256 checksums..." -ForegroundColor Gray
$hash = (Get-FileHash -Path $zipPath -Algorithm SHA256).Hash.ToLower()
Set-Content -Path "$zipPath.sha256" -Value "$hash  $zipName" -Encoding UTF8
Set-Content -Path "$versionedZipPath.sha256" -Value "$hash  $versionedZipName" -Encoding UTF8

Write-Host " [OK] SHA-256: $hash" -ForegroundColor Green

# 6. Copy Bundled Setup Installers (NSIS / MSI) if present
$nsisSource = Join-Path $ProjectRoot "tauri\src-tauri\target\release\bundle\nsis\Rheo_${version}_x64-setup.exe"
if (Test-Path $nsisSource) {
    $destNsis = Join-Path $OutputDir "Rheo-v$version-windows-x64-setup.exe"
    Copy-Item -Path $nsisSource -Destination $destNsis -Force
    $nsisHash = (Get-FileHash -Path $destNsis -Algorithm SHA256).Hash.ToLower()
    Set-Content -Path "$destNsis.sha256" -Value "$nsisHash  $(Split-Path $destNsis -Leaf)" -Encoding UTF8
    Write-Host " [OK] Bundled NSIS setup: $destNsis" -ForegroundColor Green
}

$msiSource = Join-Path $ProjectRoot "tauri\src-tauri\target\release\bundle\msi\Rheo_${version}_x64_en-US.msi"
if (Test-Path $msiSource) {
    $destMsi = Join-Path $OutputDir "Rheo-v$version-windows-x64.msi"
    Copy-Item -Path $msiSource -Destination $destMsi -Force
    $msiHash = (Get-FileHash -Path $destMsi -Algorithm SHA256).Hash.ToLower()
    Set-Content -Path "$destMsi.sha256" -Value "$msiHash  $(Split-Path $destMsi -Leaf)" -Encoding UTF8
    Write-Host " [OK] Bundled MSI installer: $destMsi" -ForegroundColor Green
}

# Cleanup Temp Staging
Remove-Item -Path $StageDir -Recurse -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Green
Write-Host " RELEASE PACKAGING COMPLETE!" -ForegroundColor Green
Write-Host " Artifacts created in: $OutputDir" -ForegroundColor White
Write-Host "======================================================================" -ForegroundColor Green
Get-ChildItem -Path $OutputDir | Select-Object Name, @{Name="Size (MB)";Expression={[math]::Round($_.Length/1MB, 2)}} | Format-Table -AutoSize
Write-Host ""
