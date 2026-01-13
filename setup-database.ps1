# Database Setup Script for Drug Free Compliance API
# Run this script as Administrator

Write-Host "=== PostgreSQL Database Setup ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if PostgreSQL is installed
Write-Host "Step 1: Checking for PostgreSQL installation..." -ForegroundColor Yellow
$pgPaths = @(
    "C:\Program Files\PostgreSQL",
    "C:\Program Files (x86)\PostgreSQL"
)

$pgFound = $false
$pgBinPath = $null
$pgVersion = $null

foreach ($path in $pgPaths) {
    if (Test-Path $path) {
        $versions = Get-ChildItem $path -Directory | Where-Object { $_.Name -match '^\d+$' } | Sort-Object { [int]($_.Name) } -Descending
        if ($versions) {
            $pgVersion = $versions[0].Name
            $pgBinPath = Join-Path $path $pgVersion "bin"
            if (Test-Path $pgBinPath) {
                $pgFound = $true
                Write-Host "✓ PostgreSQL found at: $path\$pgVersion" -ForegroundColor Green
                break
            }
        }
    }
}

if (-not $pgFound) {
    Write-Host "✗ PostgreSQL not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install PostgreSQL first:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://www.postgresql.org/download/windows/" -ForegroundColor White
    Write-Host "2. During installation, set password to: 3421" -ForegroundColor White
    Write-Host "3. Run this script again after installation" -ForegroundColor White
    exit 1
}

# Step 2: Check if PostgreSQL service is running
Write-Host ""
Write-Host "Step 2: Checking PostgreSQL service..." -ForegroundColor Yellow
$pgServices = Get-Service | Where-Object { $_.Name -like '*postgres*' -or $_.DisplayName -like '*postgres*' }

if ($pgServices) {
    $service = $pgServices[0]
    Write-Host "Found service: $($service.DisplayName)" -ForegroundColor Cyan
    
    if ($service.Status -eq 'Running') {
        Write-Host "✓ PostgreSQL service is running" -ForegroundColor Green
    } else {
        Write-Host "⚠ PostgreSQL service is not running. Attempting to start..." -ForegroundColor Yellow
        try {
            Start-Service -Name $service.Name -ErrorAction Stop
            Start-Sleep -Seconds 3
            Write-Host "✓ PostgreSQL service started successfully" -ForegroundColor Green
        } catch {
            Write-Host "✗ Failed to start service. Please start it manually:" -ForegroundColor Red
            Write-Host "  Start-Service -Name '$($service.Name)'" -ForegroundColor White
            Write-Host "  Or use Services.msc GUI" -ForegroundColor White
            exit 1
        }
    }
} else {
    Write-Host "⚠ PostgreSQL service not found. Trying to start PostgreSQL manually..." -ForegroundColor Yellow
    Write-Host "Please ensure PostgreSQL is running before continuing." -ForegroundColor Yellow
}

# Step 3: Test connection
Write-Host ""
Write-Host "Step 3: Testing database connection..." -ForegroundColor Yellow
$connectionTest = Test-NetConnection -ComputerName localhost -Port 5432 -InformationLevel Quiet -WarningAction SilentlyContinue

if ($connectionTest) {
    Write-Host "✓ Port 5432 is accessible" -ForegroundColor Green
} else {
    Write-Host "✗ Cannot connect to PostgreSQL on port 5432" -ForegroundColor Red
    Write-Host "Please ensure PostgreSQL is running and accessible" -ForegroundColor Yellow
    exit 1
}

# Step 4: Create database
Write-Host ""
Write-Host "Step 4: Creating database 'mybizhelperapi'..." -ForegroundColor Yellow

$psqlPath = Join-Path $pgBinPath "psql.exe"
if (-not (Test-Path $psqlPath)) {
    Write-Host "✗ psql.exe not found at: $psqlPath" -ForegroundColor Red
    exit 1
}

# Set password for psql
$env:PGPASSWORD = "3421"

# Check if database exists
$dbCheck = & $psqlPath -U postgres -h localhost -lqt 2>&1 | Select-String "mybizhelperapi"

if ($dbCheck) {
    Write-Host "✓ Database 'mybizhelperapi' already exists" -ForegroundColor Green
} else {
    Write-Host "Creating database..." -ForegroundColor Cyan
    $createDb = & $psqlPath -U postgres -h localhost -c "CREATE DATABASE mybizhelperapi;" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Database 'mybizhelperapi' created successfully" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to create database:" -ForegroundColor Red
        Write-Host $createDb -ForegroundColor Red
        Write-Host ""
        Write-Host "You may need to create it manually:" -ForegroundColor Yellow
        Write-Host "  psql -U postgres" -ForegroundColor White
        Write-Host "  CREATE DATABASE mybizhelperapi;" -ForegroundColor White
        exit 1
    }
}

# Step 5: Run Prisma migrations
Write-Host ""
Write-Host "Step 5: Running Prisma migrations..." -ForegroundColor Yellow

try {
    npx prisma migrate deploy
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Migrations applied successfully" -ForegroundColor Green
    } else {
        Write-Host "⚠ Migration had issues. Try running manually: npx prisma migrate deploy" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠ Error running migrations: $_" -ForegroundColor Yellow
    Write-Host "You can run manually: npx prisma migrate deploy" -ForegroundColor White
}

# Step 6: Verify connection
Write-Host ""
Write-Host "Step 6: Verifying database connection..." -ForegroundColor Yellow
npm run db:check

Write-Host ""
Write-Host "=== Setup Complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "You can now test your API endpoints:" -ForegroundColor Cyan
Write-Host "  POST http://localhost:3000/api/auth/register" -ForegroundColor White
Write-Host ""



