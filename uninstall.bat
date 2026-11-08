@echo off
setlocal

title Rheo - Uninstaller

if "%~1"=="/?" goto :show_help
if "%~1"=="-h" goto :show_help
if "%~1"=="--help" goto :show_help

set "SCRIPT_DIR=%~dp0"
set "LOCAL_PS1=%SCRIPT_DIR%installer\installer.ps1"
set "INSTALLED_PS1=%LOCALAPPDATA%\Programs\Rheo\installer\installer.ps1"
set "TARGET_PS1="

if exist "%LOCAL_PS1%" (
    set "TARGET_PS1=%LOCAL_PS1%"
    goto :run_uninstaller
)
if exist "%INSTALLED_PS1%" (
    set "TARGET_PS1=%INSTALLED_PS1%"
    goto :run_uninstaller
)

echo  [*] Bootstrapping uninstaller engine...
set "BOOTSTRAP_DIR=%TEMP%\Rheo-installer"
if not exist "%BOOTSTRAP_DIR%" mkdir "%BOOTSTRAP_DIR%" >nul 2>&1
set "TARGET_PS1=%BOOTSTRAP_DIR%\installer.ps1"

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; try { Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/MasterZ1311/Rheo/MZ-Main/installer/installer.ps1' -OutFile '%BOOTSTRAP_DIR%\installer.ps1' -UseBasicParsing } catch { Write-Host 'Failed to fetch uninstaller script: ' $_.Exception.Message -ForegroundColor Red; exit 1 }"

if not exist "%TARGET_PS1%" (
    echo  [ERROR] Uninstaller script could not be located or downloaded.
    pause
    exit /b 1
)

:run_uninstaller
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%TARGET_PS1%" -Action uninstall %*
set "UNINSTALL_STATUS=%ERRORLEVEL%"

if not "%UNINSTALL_STATUS%"=="0" goto :uninstall_error
exit /b 0

:uninstall_error
echo(
echo  [ERROR] Uninstallation encountered an issue (Exit code: %UNINSTALL_STATUS%).
pause
exit /b %UNINSTALL_STATUS%

:show_help
echo Rheo Uninstaller
echo Usage: uninstall.bat [-Silent] [-PurgeData]
exit /b 0
