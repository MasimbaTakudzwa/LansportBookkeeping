@echo off
title Lansport Analytics

echo.
echo  ============================================
echo    LANSPORT ANALYTICS
echo    Financial Data Platform
echo  ============================================
echo.

REM ---- Check Docker is available ----
where docker >nul 2>&1
if %errorlevel% neq 0 (
    echo  ERROR: Docker not found on this machine.
    echo.
    echo  Please install Docker Desktop for Windows:
    echo  https://www.docker.com/products/docker-desktop/
    echo.
    echo  After installing, restart your PC then run this script again.
    echo.
    pause
    exit /b 1
)

REM ---- Check Docker daemon is running ----
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo  ERROR: Docker Desktop is installed but not running.
    echo.
    echo  Please start Docker Desktop from the system tray or Start Menu,
    echo  wait for it to fully load, then run this script again.
    echo.
    pause
    exit /b 1
)

REM ---- Create .env from template if it doesn't exist ----
if not exist .env (
    echo  INFO: First run detected — creating .env from template...
    copy .env.example .env >nul
    echo  INFO: .env created. Edit it to change passwords before going live.
    echo.
)

REM ---- Build and start all services ----
echo  Starting all services (this may take a few minutes on first run)...
echo.
docker compose up -d --build

if %errorlevel% neq 0 (
    echo.
    echo  ERROR: Failed to start services.
    echo  Check logs with: docker compose logs
    echo.
    pause
    exit /b 1
)

echo.
echo  Waiting for services to initialise...
timeout /t 12 /nobreak >nul

echo.
echo  ============================================
echo    Lansport Analytics is running!
echo    Open your browser to: http://localhost
echo  ============================================
echo.

REM ---- Open browser ----
start http://localhost

echo  To stop all services, run: STOP_LANSPORT.bat
echo.
pause
