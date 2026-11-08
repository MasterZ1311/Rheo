@echo off
setlocal

title Rheo - Sovereign Voice Studio Installer

echo(
echo  ======================================================================
echo    R H E O  -  S O V E R E I G N  V O I C E  S T U D I O
echo    Windows Automated One-Click Installer
echo  ======================================================================
echo(

REM Check help flag
if "%~1"=="/?" goto :show_help
if "%~1"=="-h" goto :show_help
if "%~1"=="--help" goto :show_help

REM 1. Architecture Check (Must be 64-bit AMD64)
if "%PROCESSOR_ARCHITECTURE%"=="AMD64" goto :arch_ok
if "%PROCESSOR_ARCHITEW6432%"=="AMD64" goto :arch_ok

echo  [ERROR] Rheo requires a 64-bit Windows operating system (x64 / AMD64).
echo         Detected architecture: %PROCESSOR_ARCHITECTURE%
echo(
echo  Installation cannot proceed on 32-bit systems.
pause
exit /b 2

:arch_ok

REM 2. Check for PowerShell
where powershell.exe >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo  [ERROR] Windows PowerShell is required to run the automated installer.
    echo         Please ensure PowerShell 5.1+ is enabled on your Windows system.
    pause
    exit /b 3
)

REM 3. Locate or Bootstrap Installer Script
set "SCRIPT_DIR=%~dp0"
set "LOCAL_PS1=%SCRIPT_DIR%installer\installer.ps1"
set "TARGET_PS1=%LOCAL_PS1%"

if exist "%LOCAL_PS1%" goto :run_installer

echo  [*] Bootstrapping installer engine from GitHub repository...
set "BOOTSTRAP_DIR=%TEMP%\Rheo-installer"
if not exist "%BOOTSTRAP_DIR%" mkdir "%BOOTSTRAP_DIR%" >nul 2>&1
set "TARGET_PS1=%BOOTSTRAP_DIR%\installer.ps1"

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; try { Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/MasterZ1311/Rheo/MZ-Main/installer/installer.ps1' -OutFile '%BOOTSTRAP_DIR%\installer.ps1' -UseBasicParsing } catch { Write-Host 'Failed to fetch installer script' -ForegroundColor Red; exit 1 }"

if not exist "%BOOTSTRAP_DIR%\installer.ps1" (
    echo(
    echo  [ERROR] Failed to download installer components.
    echo         Please check your internet connection or download the full repository ZIP.
    pause
    exit /b 4
)

:run_installer
REM 4. Execute Installer Engine
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%TARGET_PS1%" -Action install %*
set "INSTALL_STATUS=%ERRORLEVEL%"

if not "%INSTALL_STATUS%"=="0" goto :install_error
exit /b 0

:install_error
echo(
echo  [ERROR] Installation did not complete successfully (Exit code: %INSTALL_STATUS%).
echo         See log details at: %LOCALAPPDATA%\Rheo\logs\installer.log
pause
exit /b %INSTALL_STATUS%

:show_help
echo Rheo Windows One-Click Installer
echo Usage: install.bat [-Silent] [-NoLaunch] [-CustomVersion ^<version^>]
exit /b 0
