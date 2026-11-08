@echo off
setlocal

title Rheo - Release Packaging Pipeline

set "SCRIPT_DIR=%~dp0"
set "PACKAGE_PS1=%SCRIPT_DIR%package-windows-release.ps1"

if not exist "%PACKAGE_PS1%" (
    echo [ERROR] %PACKAGE_PS1% not found.
    pause
    exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PACKAGE_PS1%" %*
set "EXIT_CODE=%ERRORLEVEL%"

if %EXIT_CODE% neq 0 (
    echo.
    echo [ERROR] Packaging failed with exit code %EXIT_CODE%.
    pause
    exit /b %EXIT_CODE%
)

echo.
echo Package operation succeeded.
exit /b 0
