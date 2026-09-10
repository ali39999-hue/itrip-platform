@echo off
setlocal enabledelayedexpansion

echo ============================================================
echo   Firuzo Platform - Docker Management Utility
echo ============================================================

if "%1"=="infra" goto start_infra
if "%1"=="dev" goto start_dev
if "%1"=="prod" goto start_prod
if "%1"=="down" goto stop_all
if "%1"=="migrate" goto run_migrate
if "%1"=="seed" goto run_seed
if "%1"=="logs" goto show_logs

:menu
echo.
echo Please select an operation mode:
echo [1] Infrastructure Only (PostgreSQL 16 + Redis 7 + Adminer) - "Connect to Docker"
echo [2] Full Development Stack (Hot-Reloading in Docker)
echo [3] Full Production Stack (Optimized Multi-stage App + Worker + DB + Redis)
echo [4] Stop All Containers
echo [5] Apply Database Migrations (Prisma)
echo [6] Seed Initial Database Data
echo [7] View Container Status and Logs
echo [0] Exit
echo.
set /p choice="Enter choice [0-7]: "

if "%choice%"=="1" goto start_infra
if "%choice%"=="2" goto start_dev
if "%choice%"=="3" goto start_prod
if "%choice%"=="4" goto stop_all
if "%choice%"=="5" goto run_migrate
if "%choice%"=="6" goto run_seed
if "%choice%"=="7" goto show_logs
if "%choice%"=="0" exit /b 0
goto menu

:start_infra
echo.
echo [*] Starting Infrastructure containers (PostgreSQL + Redis)...
docker compose -f docker-compose.infra.yml up -d
if %errorlevel% neq 0 (
    echo [!] Failed to start infrastructure. Please ensure Docker Desktop is running.
    pause
    exit /b %errorlevel%
)
echo [v] Infrastructure is UP!
echo     - PostgreSQL: localhost:5432 (Database: itrip, User: postgres)
echo     - Redis:      localhost:6379
echo     - Adminer UI: http://localhost:8080
echo.
echo Now you can run `npm run dev` on your host machine to connect!
pause
exit /b 0

:start_dev
echo.
echo [*] Starting Full Development Stack with Hot Reloading...
docker compose -f docker-compose.dev.yml up
pause
exit /b 0

:start_prod
echo.
echo [*] Building and Starting Full Production Stack...
docker compose up -d --build
if %errorlevel% neq 0 (
    echo [!] Failed to start production stack.
    pause
    exit /b %errorlevel%
)
echo [v] Production stack is running in background!
echo     - App Web:    http://localhost:3000
echo     - Health:     http://localhost:3000/api/health/live
echo     - PostgreSQL: localhost:5432
echo     - Redis:      localhost:6379
pause
exit /b 0

:stop_all
echo.
echo [*] Stopping all Docker containers...
docker compose down
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.infra.yml down
echo [v] All containers stopped.
pause
exit /b 0

:run_migrate
echo.
echo [*] Applying Prisma database migrations inside container...
docker compose exec app npx prisma migrate deploy
pause
exit /b 0

:run_seed
echo.
echo [*] Seeding database inside container...
docker compose exec app npm run prisma:seed
pause
exit /b 0

:show_logs
echo.
echo [*] Docker container statuses:
docker ps --filter "name=firuzo"
echo.
set /p follow="Follow logs? (y/n): "
if /i "%follow%"=="y" (
    docker compose logs -f
)
pause
exit /b 0
