@echo off
setlocal

title Rheo - Launcher

if "%~1"=="/?" goto :show_help
if "%~1"=="-h" goto :show_help
if "%~1"=="--help" goto :show_help

set "CURRENT_DIR=%~dp0"
set "LOCAL_EXE=%CURRENT_DIR%Rheo.exe"
set "INSTALLED_EXE=%LOCALAPPDATA%\Programs\Rheo\Rheo.exe"

REM 1. Check if Rheo.exe exists
if exist "%LOCAL_EXE%" (
    set "TARGET_EXE=%LOCAL_EXE%"
    set "RUN_DIR=%CURRENT_DIR%"
    goto :launch_desktop
)
if exist "%INSTALLED_EXE%" (
    set "TARGET_EXE=%INSTALLED_EXE%"
    set "RUN_DIR=%LOCALAPPDATA%\Programs\Rheo"
    goto :launch_desktop
)

goto :check_backend

:launch_desktop
tasklist /fi "imagename eq Rheo.exe" 2>nul | find /i "Rheo.exe" >nul
if %ERRORLEVEL% equ 0 (
    echo  [INFO] Rheo is already running.
    start "" "%TARGET_EXE%"
    exit /b 0
)

echo  [*] Starting Rheo Desktop...
cd /d "%RUN_DIR%"
start "" "%TARGET_EXE%" %*
exit /b 0

:check_backend
set "BACKEND_MAIN=%CURRENT_DIR%backend\main.py"
set "INSTALLED_BACKEND=%LOCALAPPDATA%\Programs\Rheo\backend\main.py"

if exist "%BACKEND_MAIN%" (
    set "TARGET_BACKEND=%CURRENT_DIR%"
    goto :launch_backend
)
if exist "%INSTALLED_BACKEND%" (
    set "TARGET_BACKEND=%LOCALAPPDATA%\Programs\Rheo"
    goto :launch_backend
)

echo  [ERROR] Rheo is not installed.
echo         Please run install.bat to install the application first.
echo(
pause
exit /b 1

:launch_backend
netstat -ano 2>nul | findstr /R /C:":17493 " >nul
if %ERRORLEVEL% equ 0 (
    echo  [INFO] Rheo backend server is already active on port 17493.
    start "" "http://127.0.0.1:17493"
    exit /b 0
)

where python.exe >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo  [ERROR] Python is required to run Rheo in development/web mode.
    pause
    exit /b 2
)

echo  [*] Launching Rheo server on http://127.0.0.1:17493...
cd /d "%TARGET_BACKEND%"
start "Rheo Server" /min python -m backend.main --port 17493

REM Wait briefly for server startup without using timeout (which fails on non-interactive inputs)
ping 127.0.0.1 -n 3 >nul
start "" "http://127.0.0.1:17493"
exit /b 0

:show_help
echo Rheo Launcher
echo Usage: launch.bat
exit /b 0
