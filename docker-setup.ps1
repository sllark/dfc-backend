# Docker PostgreSQL Setup Script
# This script sets up PostgreSQL in Docker for the Drug Free Compliance API

Write-Host "=== Docker PostgreSQL Setup ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if Docker is running
Write-Host "Step 1: Checking Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version 2>&1
    Write-Host "✓ Docker installed: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

# Step 2: Check if Docker daemon is running
Write-Host ""
Write-Host "Step 2: Checking Docker daemon..." -ForegroundColor Yellow
$dockerCheck = docker ps 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Docker daemon is running" -ForegroundColor Green
} else {
    Write-Host "✗ Docker daemon is not running" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please start Docker Desktop:" -ForegroundColor Yellow
    Write-Host "1. Open Docker Desktop application" -ForegroundColor White
    Write-Host "2. Wait for it to fully start (whale icon in system tray)" -ForegroundColor White
    Write-Host "3. Run this script again" -ForegroundColor White
    exit 1
}

# Step 3: Check if container already exists
Write-Host ""
Write-Host "Step 3: Checking for existing container..." -ForegroundColor Yellow
$existingContainer = docker ps -a --filter "name=drugfreecompliance-postgres" --format "{{.Names}}" 2>&1

if ($existingContainer -eq "drugfreecompliance-postgres") {
    Write-Host "⚠ Container already exists" -ForegroundColor Yellow
    
    # Check if it's running
    $running = docker ps --filter "name=drugfreecompliance-postgres" --format "{{.Names}}" 2>&1
    if ($running -eq "drugfreecompliance-postgres") {
        Write-Host "✓ Container is already running" -ForegroundColor Green
    } else {
        Write-Host "Starting existing container..." -ForegroundColor Cyan
        docker start drugfreecompliance-postgres
        Start-Sleep -Seconds 3
        Write-Host "✓ Container started" -ForegroundColor Green
    }
} else {
    # Step 4: Start PostgreSQL container
    Write-Host ""
    Write-Host "Step 4: Starting PostgreSQL container..." -ForegroundColor Yellow
    Write-Host "This will create a new PostgreSQL 16 container with:" -ForegroundColor Cyan
    Write-Host "  - Database: mybizhelperapi" -ForegroundColor White
    Write-Host "  - User: postgres" -ForegroundColor White
    Write-Host "  - Password: 3421" -ForegroundColor White
    Write-Host "  - Port: 5432" -ForegroundColor White
    Write-Host ""
    
    docker-compose up -d
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ PostgreSQL container started successfully" -ForegroundColor Green
        Write-Host "Waiting for PostgreSQL to be ready..." -ForegroundColor Cyan
        Start-Sleep -Seconds 5
    } else {
        Write-Host "✗ Failed to start container" -ForegroundColor Red
        exit 1
    }
}

# Step 5: Wait for PostgreSQL to be ready
Write-Host ""
Write-Host "Step 5: Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
$maxAttempts = 30
$attempt = 0
$ready = $false

while ($attempt -lt $maxAttempts -and -not $ready) {
    $health = docker exec drugfreecompliance-postgres pg_isready -U postgres 2>&1
    if ($LASTEXITCODE -eq 0) {
        $ready = $true
        Write-Host "✓ PostgreSQL is ready!" -ForegroundColor Green
    } else {
        $attempt++
        Write-Host "  Attempt $attempt/$maxAttempts..." -ForegroundColor Gray
        Start-Sleep -Seconds 2
    }
}

if (-not $ready) {
    Write-Host "⚠ PostgreSQL is taking longer than expected to start" -ForegroundColor Yellow
    Write-Host "You can check status with: docker logs drugfreecompliance-postgres" -ForegroundColor White
}

# Step 6: Verify connection
Write-Host ""
Write-Host "Step 6: Verifying database connection..." -ForegroundColor Yellow
npm run db:check

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Database connection successful!" -ForegroundColor Green
} else {
    Write-Host "⚠ Connection test failed, but container is running" -ForegroundColor Yellow
    Write-Host "You may need to wait a few more seconds for PostgreSQL to fully initialize" -ForegroundColor White
}

# Step 7: Run migrations
Write-Host ""
Write-Host "Step 7: Running database migrations..." -ForegroundColor Yellow
npx prisma migrate deploy

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Migrations applied successfully" -ForegroundColor Green
} else {
    Write-Host "⚠ Migration had issues. You can run manually: npx prisma migrate deploy" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Setup Complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "PostgreSQL is now running in Docker:" -ForegroundColor Cyan
Write-Host "  Container: drugfreecompliance-postgres" -ForegroundColor White
Write-Host "  Port: 5432" -ForegroundColor White
Write-Host "  Database: mybizhelperapi" -ForegroundColor White
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Cyan
Write-Host "  docker ps                          # View running containers" -ForegroundColor White
Write-Host "  docker logs drugfreecompliance-postgres  # View logs" -ForegroundColor White
Write-Host "  docker stop drugfreecompliance-postgres  # Stop container" -ForegroundColor White
Write-Host "  docker start drugfreecompliance-postgres # Start container" -ForegroundColor White
Write-Host "  docker-compose down                 # Stop and remove container" -ForegroundColor White
Write-Host ""

