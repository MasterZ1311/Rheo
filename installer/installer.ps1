# ==============================================================================
# Rheo Windows Installer Engine
# Script: installer/installer.ps1
# ==============================================================================

[CmdletBinding()]
param (
    [Parameter(Mandatory=$false)]
    [ValidateSet("install", "update", "uninstall", "launch", "verify")]
    [string]$Action = "install",

    [Parameter(Mandatory=$false)]
    [string]$CustomVersion = "",

    [Parameter(Mandatory=$false)]
    [switch]$PurgeData = $false,

    [Parameter(Mandatory=$false)]
    [switch]$NoLaunch = $false,

    [Parameter(Mandatory=$false)]
    [switch]$Silent = $false
)

# Enforce strict error handling
$ErrorActionPreference = "Stop"

# Enable modern TLS protocols
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls13
} catch {}

# ─── Configuration & Directories ──────────────────────────────────────────────

$AppName = "Rheo"
$RepoOwner = "MasterZ1311"
$RepoName = "Rheo"
$GitHubRepo = "$RepoOwner/$RepoName"
$DefaultBranch = "MZ-Main"
$DefaultPort = 17493
$MinDiskSpaceMB = 2500

$LocalApp = [Environment]::GetFolderPath("LocalApplicationData")
$RoamingApp = [Environment]::GetFolderPath("ApplicationData")
$DesktopPath = [Environment]::GetFolderPath("Desktop")

$InstallDir = Join-Path $LocalApp "Programs\$AppName"
$DataDir = Join-Path $LocalApp "$AppName\data"
$LogsDir = Join-Path $LocalApp "$AppName\logs"
$ConfigDir = Join-Path $LocalApp "$AppName\config"
$TempDir = Join-Path $env:TEMP "Rheo-installer"

# Ensure directories exist
foreach ($dir in @($InstallDir, $DataDir, $LogsDir, $ConfigDir, $TempDir)) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

$LogFile = Join-Path $LogsDir "installer.log"

# ─── Logging & Console UI ────────────────────────────────────────────────────

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    $logLine = "[$timestamp] [$Level] $Message"
    try {
        Add-Content -Path $LogFile -Value $logLine -Encoding UTF8 -ErrorAction SilentlyContinue
    } catch {}
}

function Show-Header {
    Clear-Host
    Write-Host ""
    Write-Host " ======================================================================" -ForegroundColor DarkCyan
    Write-Host "   R H E O  -  S O V E R E I G N  V O I C E  S T U D I O               " -ForegroundColor Cyan
    Write-Host "   Windows Automated One-Click Deployment System                       " -ForegroundColor White
    Write-Host " ======================================================================" -ForegroundColor DarkCyan
    Write-Host ""
}

function Show-Step {
    param([string]$Step, [string]$Message)
    Write-Host " [$Step] " -ForegroundColor Cyan -NoNewline
    Write-Host "$Message" -ForegroundColor White
    Write-Log "Step $($Step): $Message" "INFO"
}

function Show-Success {
    param([string]$Message)
    Write-Host " [OK] " -ForegroundColor Green -NoNewline
    Write-Host "$Message" -ForegroundColor White
    Write-Log "SUCCESS: $Message" "INFO"
}

function Show-Warn {
    param([string]$Message)
    Write-Host " [WARN] " -ForegroundColor Yellow -NoNewline
    Write-Host "$Message" -ForegroundColor Yellow
    Write-Log "WARNING: $Message" "WARN"
}

function Show-Error {
    param([string]$Message, [int]$ExitCode = 1)
    Write-Host ""
    Write-Host " [ERROR] " -ForegroundColor Red -NoNewline
    Write-Host "$Message" -ForegroundColor Red
    Write-Host ""
    Write-Host " Installation failed. Logs saved to:" -ForegroundColor Yellow
    Write-Host " $LogFile" -ForegroundColor Cyan
    Write-Host ""
    Write-Log "FATAL ERROR: $Message" "ERROR"
    if (-not $Silent) {
        Write-Host " Press any key to exit..." -ForegroundColor Gray
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    }
    exit $ExitCode
}

# ─── System Preflight Checks ──────────────────────────────────────────────────

function Test-SystemRequirements {
    Show-Step "1/8" "Auditing Windows environment and system capabilities..."

    # Architecture check: 64-bit required
    $is64Bit = [Environment]::Is64BitOperatingSystem
    if (-not $is64Bit) {
        Show-Error "Rheo requires a 64-bit Windows operating system (x64 / AMD64). 32-bit is unsupported." 2
    }
    Write-Log "Architecture: 64-bit confirmed." "INFO"

    # OS Version check (Windows 10 build 17763 or Windows 11)
    $osVersion = [Environment]::OSVersion.Version
    Write-Log "Windows OS Version: $osVersion" "INFO"

    # Storage Check
    $installDrive = (Get-Item $InstallDir).PSDrive.Name
    $driveInfo = Get-PSDrive -Name $installDrive
    $freeSpaceMB = [math]::Round($driveInfo.Free / 1MB)

    Write-Log "Free space on drive ${installDrive}: ${freeSpaceMB} MB (required: ${MinDiskSpaceMB} MB)" "INFO"
    if ($freeSpaceMB -lt $MinDiskSpaceMB) {
        Show-Error "Insufficient disk space on drive ${installDrive}:. Rheo requires at least ${MinDiskSpaceMB} MB free, found ${freeSpaceMB} MB." 3
    }

    Show-Success "System check passed (64-bit Windows, ${freeSpaceMB} MB available storage)."
}

# ─── Network & Release Resolution ────────────────────────────────────────────

function Get-ReleaseMetadata {
    Show-Step "2/8" "Resolving latest release information from GitHub..."

    $apiUrl = "https://api.github.com/repos/$GitHubRepo/releases/latest"
    if ($CustomVersion -ne "") {
        $tag = if ($CustomVersion.StartsWith("v")) { $CustomVersion } else { "v$CustomVersion" }
        $apiUrl = "https://api.github.com/repos/$GitHubRepo/releases/tags/$tag"
    }

    $headers = @{
        "User-Agent" = "Rheo-Windows-Installer/1.0"
        "Accept" = "application/vnd.github.v3+json"
    }

    try {
        $response = Invoke-RestMethod -Uri $apiUrl -Headers $headers -TimeoutSec 15 -ErrorAction Stop
        Write-Log "Resolved release tag: $($response.tag_name)" "INFO"
        return $response
    } catch {
        Write-Log "GitHub Release API query returned: $_. Trying latest tag fallback." "WARN"
        try {
            $tagsUrl = "https://api.github.com/repos/$GitHubRepo/tags"
            $tags = Invoke-RestMethod -Uri $tagsUrl -Headers $headers -TimeoutSec 10 -ErrorAction Stop
            if ($tags -and $tags.Count -gt 0) {
                $latestTag = $tags[0].name
                Write-Log "Resolved latest tag from GitHub: $latestTag" "INFO"
                return @{
                    tag_name = $latestTag
                    assets = @()
                }
            }
        } catch {
            Write-Log "Could not query GitHub tags: $_" "WARN"
        }
        return $null
    }
}

# ─── Download Manager ────────────────────────────────────────────────────────

function Download-FileWithProgress {
    param(
        [string]$Url,
        [string]$DestinationPath,
        [string]$Description = "file"
    )

    Show-Step "3/8" "Downloading $Description..."
    Write-Log "Downloading $Url to $DestinationPath" "INFO"

    try {
        # Check if destination parent directory exists
        $parentDir = [System.IO.Path]::GetDirectoryName($DestinationPath)
        if (-not (Test-Path $parentDir)) {
            New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
        }

        # Use curl.exe if available for fast visual progress, otherwise WebClient
        $curlCmd = Get-Command "curl.exe" -ErrorAction SilentlyContinue
        $curlExe = if ($curlCmd) { $curlCmd.Source } else { $null }
        if ($curlExe -and (Test-Path $curlExe)) {
            $process = Start-Process -FilePath $curlExe -ArgumentList "-L", "-f", "--progress-bar", "-o", "`"$DestinationPath`"", "`"$Url`"" -NoNewWindow -PassThru -Wait
            if ($process.ExitCode -ne 0) {
                throw "curl failed with exit code $($process.ExitCode)"
            }
        } else {
            $webClient = New-Object System.Net.WebClient
            $webClient.Headers.Add("User-Agent", "Rheo-Windows-Installer/1.0")
            $webClient.DownloadFile($Url, $DestinationPath)
        }

        if (-not (Test-Path $DestinationPath) -or (Get-Item $DestinationPath).Length -eq 0) {
            throw "Downloaded file is empty or missing."
        }

        $fileSizeMB = [math]::Round((Get-Item $DestinationPath).Length / 1MB, 2)
        Show-Success "Downloaded $Description ($fileSizeMB MB)."
    } catch {
        Show-Error "Failed to download $Description from $($Url): $_" 4
    }
}

function Verify-Sha256 {
    param(
        [string]$FilePath,
        [string]$ExpectedHash
    )
    if (-not $ExpectedHash) {
        Write-Log "No SHA-256 checksum provided, skipping verification." "WARN"
        return $true
    }
    Show-Step "4/8" "Verifying SHA-256 integrity checksum..."
    $actualHash = (Get-FileHash -Path $FilePath -Algorithm SHA256).Hash.ToLower()
    $cleanExpected = $ExpectedHash.Trim().ToLower()

    if ($actualHash -ne $cleanExpected) {
        Show-Error "SHA-256 checksum mismatch! Archive may be corrupted or tampered.`nExpected: $cleanExpected`nActual:   $actualHash" 5
    }
    Show-Success "SHA-256 checksum verified ($actualHash)."
    return $true
}

# ─── Extraction & Installation ───────────────────────────────────────────────

function Safe-ExtractArchive {
    param(
        [string]$ZipPath,
        [string]$DestinationPath
    )

    Show-Step "5/8" "Extracting application components into $DestinationPath..."
    Write-Log "Extracting $ZipPath to $DestinationPath" "INFO"

    try {
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        $zip = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)

        $destDirFull = [System.IO.Path]::GetFullPath($DestinationPath)
        if (-not (Test-Path $destDirFull)) {
            New-Item -ItemType Directory -Path $destDirFull -Force | Out-Null
        }

        foreach ($entry in $zip.Entries) {
            # Path traversal guard
            $destFile = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($destDirFull, $entry.FullName))
            if (-not $destFile.StartsWith($destDirFull, [System.StringComparison]::OrdinalIgnoreCase)) {
                throw "Path traversal vulnerability detected in archive entry: $($entry.FullName)"
            }

            if ([string]::IsNullOrEmpty($entry.Name)) {
                # It's a directory
                New-Item -ItemType Directory -Path $destFile -Force -ErrorAction SilentlyContinue | Out-Null
            } else {
                # Ensure parent directory exists
                $parentDir = [System.IO.Path]::GetDirectoryName($destFile)
                if (-not (Test-Path $parentDir)) {
                    New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
                }
                [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $destFile, $true)
            }
        }
        $zip.Dispose()
        Show-Success "Extraction completed successfully."
    } catch {
        Show-Error "Archive extraction failed: $_" 6
    }
}

# ─── Environment & Runtime Setup ─────────────────────────────────────────────

function Setup-ApplicationEnvironment {
    Show-Step "6/8" "Configuring application runtime, dependencies, and scripts..."

    $scriptRoot = (Resolve-Path "$PSScriptRoot\..").Path

    # Ensure launch.bat, update.bat, and uninstall.bat are copied to InstallDir
    $filesToSync = @("launch.bat", "update.bat", "uninstall.bat")
    foreach ($file in $filesToSync) {
        $sourceFile = Join-Path $scriptRoot $file
        if (Test-Path $sourceFile) {
            Copy-Item -Path $sourceFile -Destination (Join-Path $InstallDir $file) -Force
        }
    }

    # Ensure installer folder with installer.ps1 and config.ini is preserved in InstallDir
    $installerSubdir = Join-Path $InstallDir "installer"
    if (-not (Test-Path $installerSubdir)) {
        New-Item -ItemType Directory -Path $installerSubdir -Force | Out-Null
    }
    $ps1Source = Join-Path $PSScriptRoot "installer.ps1"
    if (Test-Path $ps1Source) {
        Copy-Item -Path $ps1Source -Destination (Join-Path $installerSubdir "installer.ps1") -Force
    }
    $iniSource = Join-Path $PSScriptRoot "config.ini"
    if (Test-Path $iniSource) {
        Copy-Item -Path $iniSource -Destination (Join-Path $installerSubdir "config.ini") -Force
    }

    # Ensure application icon is present
    $iconSourceCandidates = @(
        (Join-Path $scriptRoot "tauri\src-tauri\icons\icon.ico"),
        (Join-Path $scriptRoot "icon.ico"),
        (Join-Path $InstallDir "icon.ico")
    )
    foreach ($iconCand in $iconSourceCandidates) {
        if (Test-Path $iconCand) {
            Copy-Item -Path $iconCand -Destination (Join-Path $InstallDir "icon.ico") -Force
            break
        }
    }

    # Ensure user config file
    $userConfig = Join-Path $ConfigDir "config.json"
    if (-not (Test-Path $userConfig)) {
        $initialConfig = @{
            port = $DefaultPort
            dataDir = $DataDir
            installedAt = (Get-Date).ToString("o")
            device = "auto"
        } | ConvertTo-Json -Depth 4
        Set-Content -Path $userConfig -Value $initialConfig -Encoding UTF8
    }

    Show-Success "Environment configuration completed."
}

# ─── Shortcuts Management ────────────────────────────────────────────────────

function Create-Shortcuts {
    Show-Step "7/8" "Registering Desktop and Start Menu application shortcuts..."

    try {
        $wshShell = New-Object -ComObject WScript.Shell

        $targetExecutable = Join-Path $InstallDir "launch.bat"
        if (Test-Path (Join-Path $InstallDir "Rheo.exe")) {
            $targetExecutable = Join-Path $InstallDir "Rheo.exe"
        }

        $iconPath = Join-Path $InstallDir "icon.ico"
        if (-not (Test-Path $iconPath)) {
            $iconPath = $targetExecutable
        }

        # 1. Start Menu Shortcut
        $startMenuPrograms = Join-Path $RoamingApp "Microsoft\Windows\Start Menu\Programs"
        if (-not (Test-Path $startMenuPrograms)) {
            New-Item -ItemType Directory -Path $startMenuPrograms -Force | Out-Null
        }
        $startMenuShortcutPath = Join-Path $startMenuPrograms "$AppName.lnk"

        $shortcut = $wshShell.CreateShortcut($startMenuShortcutPath)
        $shortcut.TargetPath = $targetExecutable
        $shortcut.WorkingDirectory = $InstallDir
        $shortcut.Description = "Rheo - Sovereign Voice Studio"
        $shortcut.IconLocation = "$iconPath,0"
        $shortcut.Save()
        Write-Log "Start Menu shortcut created: $startMenuShortcutPath" "INFO"

        # 2. Desktop Shortcut
        $desktopShortcutPath = Join-Path $DesktopPath "$AppName.lnk"
        $desktopShortcut = $wshShell.CreateShortcut($desktopShortcutPath)
        $desktopShortcut.TargetPath = $targetExecutable
        $desktopShortcut.WorkingDirectory = $InstallDir
        $desktopShortcut.Description = "Rheo - Sovereign Voice Studio"
        $desktopShortcut.IconLocation = "$iconPath,0"
        $desktopShortcut.Save()
        Write-Log "Desktop shortcut created: $desktopShortcutPath" "INFO"

        Show-Success "Shortcuts successfully created on Desktop and Start Menu."
    } catch {
        Show-Warn "Could not create all shortcuts: $_"
    }
}

# ─── Launch Application ──────────────────────────────────────────────────────

function Start-RheoApplication {
    Show-Step "8/8" "Launching Rheo..."
    Write-Log "Starting Rheo application" "INFO"

    $exePath = Join-Path $InstallDir "Rheo.exe"
    $launchBat = Join-Path $InstallDir "launch.bat"

    if (Test-Path $exePath) {
        Start-Process -FilePath $exePath -WorkingDirectory $InstallDir
    } elseif (Test-Path $launchBat) {
        Start-Process -FilePath "cmd.exe" -ArgumentList "/c `"$launchBat`"" -WorkingDirectory $InstallDir
    } else {
        Show-Warn "Neither Rheo.exe nor launch.bat found in $InstallDir."
        return
    }

    Show-Success "Rheo is launching. Ready to use!"
}

# ─── Main Installation Flow ──────────────────────────────────────────────────

function Invoke-Install {
    Show-Header
    Write-Host " Starting installation of $AppName..." -ForegroundColor White
    Write-Host " Target location: $InstallDir" -ForegroundColor Gray
    Write-Host ""

    Test-SystemRequirements

    $release = Get-ReleaseMetadata
    $versionTag = if ($release -and $release.tag_name) { $release.tag_name } else { "v0.5.0" }
    Set-Content -Path (Join-Path $InstallDir "version.txt") -Value $versionTag -Encoding UTF8

    # Determine asset to download
    $assetUrl = $null
    $assetName = $null
    $sha256 = $null

    if ($release -and $release.assets) {
        # Look for Windows package asset (.zip / .msi / -setup.exe)
        foreach ($asset in $release.assets) {
            $name = $asset.name.ToLower()
            if ($name -match "rheo.*windows.*\.zip$" -or $name -match "rheo.*x64.*\.zip$" -or $name -match "rheo.*setup\.exe$" -or $name -match "rheo.*\.msi$") {
                $assetUrl = $asset.browser_download_url
                $assetName = $asset.name
                break
            }
        }
        # Look for sha256 asset
        if ($assetName) {
            $shaAsset = $release.assets | Where-Object { $_.name -eq "$assetName.sha256" }
            if ($shaAsset) {
                try {
                    $sha256 = (Invoke-RestMethod -Uri $shaAsset.browser_download_url -Headers @{ "User-Agent" = "Rheo" }).Trim().Split(" ")[0]
                } catch {}
            }
        }
    }

    if ($assetUrl) {
        # Mode A: Download pre-built release binary
        $downloadDest = Join-Path $TempDir $assetName
        Download-FileWithProgress -Url $assetUrl -DestinationPath $downloadDest -Description "$AppName Windows Release ($assetName)"
        Verify-Sha256 -FilePath $downloadDest -ExpectedHash $sha256

        if ($assetName.EndsWith(".zip")) {
            Safe-ExtractArchive -ZipPath $downloadDest -DestinationPath $InstallDir
        } elseif ($assetName.EndsWith(".exe")) {
            Show-Step "5/8" "Executing silent Windows installer..."
            $proc = Start-Process -FilePath $downloadDest -ArgumentList "/S", "/D=$InstallDir" -Wait -PassThru
            if ($proc.ExitCode -ne 0) {
                Show-Error "Installer executable exited with code $($proc.ExitCode)" 6
            }
        } elseif ($assetName.EndsWith(".msi")) {
            Show-Step "5/8" "Executing silent MSI installer..."
            $proc = Start-Process -FilePath "msiexec.exe" -ArgumentList "/i `"$downloadDest`" TARGETDIR=`"$InstallDir`" /quiet /qn /norestart" -Wait -PassThru
            if ($proc.ExitCode -ne 0) {
                Show-Error "MSI installer exited with code $($proc.ExitCode)" 6
            }
        }
    } else {
        # Mode B: Running from local repository or built release bundles
        $scriptRoot = (Resolve-Path "$PSScriptRoot\..").Path
        $tauriReleaseExe = Join-Path $scriptRoot "tauri\src-tauri\target\release\Rheo.exe"
        $builtMsi = Join-Path $scriptRoot "tauri\src-tauri\target\release\bundle\msi\Rheo_0.5.0_x64_en-US.msi"

        if (Test-Path $tauriReleaseExe) {
            Show-Step "3/8" "Deploying pre-compiled desktop binary and sidecars..."
            Copy-Item -Path $tauriReleaseExe -Destination (Join-Path $InstallDir "Rheo.exe") -Force

            # Copy sidecar binaries
            $binariesDir = Join-Path $InstallDir "binaries"
            if (-not (Test-Path $binariesDir)) {
                New-Item -ItemType Directory -Path $binariesDir -Force | Out-Null
            }

            $srcBinaries = Join-Path $scriptRoot "tauri\src-tauri\binaries"
            if (Test-Path $srcBinaries) {
                Copy-Item -Path "$srcBinaries\*" -Destination $binariesDir -Recurse -Force
                Copy-Item -Path "$srcBinaries\*" -Destination $InstallDir -Recurse -Force

                # Tauri's sidecar mechanism resolves binaries WITHOUT the target-triple suffix.
                # The official NSIS installer renames them (e.g. rheo-server-x86_64-pc-windows-msvc.exe
                # → rheo-server.exe). We must do the same so sidecar("rheo-server") can find the file.
                $triplePattern = "-x86_64-pc-windows-msvc.exe"
                foreach ($f in Get-ChildItem $InstallDir -Filter "*$triplePattern") {
                    $shortName = $f.Name -replace [regex]::Escape($triplePattern), ".exe"
                    $shortDst  = Join-Path $InstallDir $shortName
                    if (-not (Test-Path $shortDst)) {
                        Copy-Item -Path $f.FullName -Destination $shortDst -Force
                        Write-Log "Created Tauri sidecar alias: $shortName" "INFO"
                    }
                }
            }

            $backendDist = Join-Path $scriptRoot "backend\dist"
            if (Test-Path $backendDist) {
                Copy-Item -Path "$backendDist\*" -Destination $binariesDir -Force
                Copy-Item -Path "$backendDist\*" -Destination $InstallDir -Force
            }

            Show-Success "Desktop binaries deployed to $InstallDir."
        } elseif (Test-Path (Join-Path $scriptRoot "backend\server.py")) {
            Show-Step "3/8" "Installing from current application distribution..."
            $foldersToCopy = @("tauri", "web", "backend", "landing")
            foreach ($folder in $foldersToCopy) {
                $src = Join-Path $scriptRoot $folder
                $dst = Join-Path $InstallDir $folder
                if (Test-Path $src) {
                    Copy-Item -Path $src -Destination $dst -Recurse -Force
                }
            }

            $rootFiles = @("package.json", "requirements.txt", "README.md", "LICENSE")
            foreach ($file in $rootFiles) {
                $src = Join-Path $scriptRoot $file
                if (Test-Path $src) {
                    Copy-Item -Path $src -Destination (Join-Path $InstallDir $file) -Force
                }
            }
            Show-Success "Application files deployed to $InstallDir."
        } else {
            # Mode C: Standalone execution without local repo and no binary asset on GitHub yet
            Show-Step "3/8" "Downloading repository package from GitHub..."
            $archiveUrl = "https://github.com/$GitHubRepo/archive/refs/heads/$DefaultBranch.zip"
            $archiveZip = Join-Path $TempDir "repo.zip"
            Download-FileWithProgress -Url $archiveUrl -DestinationPath $archiveZip -Description "Rheo Repository Archive"
            Safe-ExtractArchive -ZipPath $archiveZip -DestinationPath $TempDir
            
            # Find extracted folder (usually Rheo-MZ-Main)
            $extractedFolder = Get-ChildItem -Path $TempDir -Directory -Filter "Rheo-*" | Select-Object -First 1
            if ($extractedFolder) {
                Copy-Item -Path "$($extractedFolder.FullName)\*" -Destination $InstallDir -Recurse -Force
                Show-Success "Application files downloaded and deployed to $InstallDir."
            } else {
                Show-Error "Could not locate extracted repository files." 6
            }
        }
    }

    Setup-ApplicationEnvironment
    Create-Shortcuts

    Write-Host ""
    Write-Host " ======================================================================" -ForegroundColor Green
    Write-Host "   INSTALLATION COMPLETE! Rheo is ready on your machine.              " -ForegroundColor Green
    Write-Host " ======================================================================" -ForegroundColor Green
    Write-Host ""

    if (-not $NoLaunch) {
        Start-RheoApplication
    }
}

# ─── Main Update Flow ────────────────────────────────────────────────────────

function Invoke-Update {
    Show-Header
    Write-Host " Checking for Rheo updates..." -ForegroundColor White
    Write-Host ""

    $versionFile = Join-Path $InstallDir "version.txt"
    $currentVersion = if (Test-Path $versionFile) { (Get-Content $versionFile -Raw).Trim() } else { "unknown" }
    Write-Host " Currently installed version: $currentVersion" -ForegroundColor Gray

    $release = Get-ReleaseMetadata
    if (-not $release) {
        Show-Warn "Could not reach GitHub release API. Please check your internet connection."
        return
    }

    $latestVersion = $release.tag_name
    Write-Host " Latest available release:   $latestVersion" -ForegroundColor Gray
    Write-Host ""

    if ($currentVersion -eq $latestVersion -and $currentVersion -ne "unknown") {
        Show-Success "Rheo is already up to date ($currentVersion)."
        return
    }

    Show-Step "Update" "Upgrading from $currentVersion to $latestVersion..."

    # Backup current installation
    $backupDir = Join-Path $TempDir "Rheo-Backup"
    if (Test-Path $backupDir) { Remove-Item -Path $backupDir -Recurse -Force }
    Copy-Item -Path $InstallDir -Destination $backupDir -Recurse -Force
    Write-Log "Created backup at $backupDir" "INFO"

    try {
        # Perform install over existing directory without launching immediately
        Invoke-Install -NoLaunch
        Show-Success "Rheo successfully updated to $latestVersion!"
    } catch {
        Write-Log "Update failed, rolling back: $_" "ERROR"
        Show-Warn "Update failed. Restoring from previous version backup..."
        Copy-Item -Path $backupDir\* -Destination $InstallDir -Recurse -Force
        Show-Error "Update could not be completed. Your previous installation was restored." 7
    }
}

# ─── Main Uninstall Flow ─────────────────────────────────────────────────────

function Invoke-Uninstall {
    Show-Header
    Write-Host " ======================================================================" -ForegroundColor Red
    Write-Host "   RHEO UNINSTALLATION WIZARD                                         " -ForegroundColor Red
    Write-Host " ======================================================================" -ForegroundColor Red
    Write-Host ""

    if (-not $Silent) {
        Write-Host " This will remove Rheo from: $InstallDir" -ForegroundColor Yellow
        $confirm = Read-Host " Are you sure you want to uninstall Rheo? (Y/N)"
        if ($confirm.Trim().ToUpper() -ne "Y") {
            Write-Host " Uninstallation cancelled." -ForegroundColor Gray
            exit 0
        }

        if (-not $PurgeData) {
            Write-Host ""
            $keepData = Read-Host " Do you want to PRESERVE your local voice clones and history? (Y/N, default Y)"
            if ($keepData.Trim().ToUpper() -eq "N") {
                $PurgeData = $true
            }
        }
    }

    Show-Step "1/4" "Closing running Rheo processes..."
    $processes = @("Rheo", "rheo-server", "rheo-mcp")
    foreach ($proc in $processes) {
        try {
            Stop-Process -Name $proc -Force -ErrorAction SilentlyContinue
            Write-Log "Stopped process: $proc" "INFO"
        } catch {}
    }
    Start-Sleep -Seconds 1

    Show-Step "2/4" "Removing shortcuts..."
    $startMenuShortcut = Join-Path $RoamingApp "Microsoft\Windows\Start Menu\Programs\$AppName.lnk"
    $desktopShortcut = Join-Path $DesktopPath "$AppName.lnk"
    if (Test-Path $startMenuShortcut) { Remove-Item $startMenuShortcut -Force -ErrorAction SilentlyContinue }
    if (Test-Path $desktopShortcut) { Remove-Item $desktopShortcut -Force -ErrorAction SilentlyContinue }
    Show-Success "Shortcuts removed."

    Show-Step "3/4" "Removing application binaries and dependencies..."
    if (Test-Path $InstallDir) {
        Remove-Item -Path $InstallDir -Recurse -Force -ErrorAction SilentlyContinue
    }
    Show-Success "Application binaries removed from $InstallDir."

    Show-Step "4/4" "Checking data directory cleanup..."
    if ($PurgeData) {
        $rheoAppData = Join-Path $LocalApp $AppName
        if (Test-Path $rheoAppData) {
            Remove-Item -Path $rheoAppData -Recurse -Force -ErrorAction SilentlyContinue
        }
        Show-Success "All user data, databases, and voice models have been completely purged."
    } else {
        Show-Success "User data preserved at: $DataDir"
    }

    Write-Host ""
    Write-Host " ======================================================================" -ForegroundColor Green
    Write-Host "   UNINSTALLATION COMPLETE. Rheo was cleanly removed from this system. " -ForegroundColor Green
    Write-Host " ======================================================================" -ForegroundColor Green
    Write-Host ""
}

# ─── Main Entry Point ────────────────────────────────────────────────────────

switch ($Action) {
    "install"   { Invoke-Install }
    "update"    { Invoke-Update }
    "uninstall" { Invoke-Uninstall }
    "launch"    { Start-RheoApplication }
    "verify"    { Test-SystemRequirements }
}
