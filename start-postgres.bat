@echo off
echo ========================================
echo Starting PostgreSQL Docker Container
echo ========================================
echo.

REM Check if Docker is running
docker ps >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Desktop is not running!
    echo.
    echo Please:
    echo 1. Open Docker Desktop application
    echo 2. Wait for it to fully start
    echo 3. Run this script again
    echo.
    pause
    exit /b 1
)

echo [INFO] Docker is running
echo [INFO] Starting PostgreSQL container...
echo.

docker-compose up -d

if errorlevel 1 (
    echo [ERROR] Failed to start container
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Container started!
echo [INFO] Waiting for PostgreSQL to initialize (15 seconds)...
timeout /t 15 /nobreak >nul

echo.
echo [INFO] Running database migrations...
call npx prisma migrate deploy

echo.
echo [INFO] Verifying connection...
call npm run db:check

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo PostgreSQL is now running in Docker
echo Container: drugfreecompliance-postgres
echo Port: 5432
echo Database: mybizhelperapi
echo.
echo You can now test your API endpoints!
echo.
pause



