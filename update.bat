@echo off
setlocal

title Rheo - Updater

echo(
echo  ======================================================================
echo    R H E O  -  S O V E R E I G N  V O I C E  S T U D I O
echo    Windows Automated Application Updater
echo  ======================================================================
echo(

if "%~1"=="/?" goto :show_help
if "%~1"=="-h" goto :show_help
if "%~1"=="--help" goto :show_help

set "SCRIPT_DIR=%~dp0"
set "LOCAL_PS1=%SCRIPT_DIR%installer\installer.ps1"
set "INSTALLED_PS1=%LOCALAPPDATA%\Programs\Rheo\installer\installer.ps1"
set "TARGET_PS1="

if exist "%LOCAL_PS1%" (
    set "TARGET_PS1=%LOCAL_PS1%"
    goto :run_updater
)
if exist "%INSTALLED_PS1%" (
    set "TARGET_PS1=%INSTALLED_PS1%"
    goto :run_updater
)

echo  [*] Bootstrapping updater engine from GitHub repository...
set "BOOTSTRAP_DIR=%TEMP%\Rheo-installer"
if not exist "%BOOTSTRAP_DIR%" mkdir "%BOOTSTRAP_DIR%" >nul 2>&1
set "TARGET_PS1=%BOOTSTRAP_DIR%\installer.ps1"

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; try { Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/MasterZ1311/Rheo/MZ-Main/installer/installer.ps1' -OutFile '%BOOTSTRAP_DIR%\installer.ps1' -UseBasicParsing } catch { Write-Host 'Failed to fetch updater script: ' $_.Exception.Message -ForegroundColor Red; exit 1 }"

if not exist "%TARGET_PS1%" (
    echo  [ERROR] Updater script could not be located or downloaded.
    echo         Please check your internet connection.
    pause
    exit /b 1
)

:run_updater
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%TARGET_PS1%" -Action update %*
set "UPDATE_STATUS=%ERRORLEVEL%"

if not "%UPDATE_STATUS%"=="0" goto :update_error
exit /b 0

:update_error
echo(
echo  [ERROR] Update failed with error code %UPDATE_STATUS%.
echo         See log details at: %LOCALAPPDATA%\Rheo\logs\installer.log
pause
exit /b %UPDATE_STATUS%

:show_help
echo Rheo Updater
echo Usage: update.bat [-Silent] [-CustomVersion ^<version^>]
exit /b 0
