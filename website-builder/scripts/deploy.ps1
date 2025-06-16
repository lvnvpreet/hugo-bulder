# Website Builder Production Deployment Script (PowerShell)
param(
    [Parameter(Position=0)]
    [ValidateSet("deploy", "rollback", "health", "backup")]
    [string]$Action = "deploy",
    
    [Parameter(Position=1)]
    [string]$BackupDir = ""
)

# Configuration
$PROJECT_NAME = "website-builder"
$DOCKER_COMPOSE_FILE = "docker-compose.yml"
$ENV_FILE = ".env"

# Functions
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    switch ($Level) {
        "INFO"    { Write-Host "[$timestamp] 🔵 $Message" -ForegroundColor Blue }
        "SUCCESS" { Write-Host "[$timestamp] ✅ $Message" -ForegroundColor Green }
        "WARNING" { Write-Host "[$timestamp] ⚠️  $Message" -ForegroundColor Yellow }
        "ERROR"   { Write-Host "[$timestamp] ❌ $Message" -ForegroundColor Red }
    }
}

function Test-Prerequisites {
    Write-Log "Validating deployment environment..."
    
    # Check Docker
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Log "Docker is required but not installed" "ERROR"
        exit 1
    }
    
    # Check Docker Compose
    if (-not (Get-Command docker-compose -ErrorAction SilentlyContinue)) {
        Write-Log "Docker Compose is required but not installed" "ERROR"
        exit 1
    }
    
    # Check environment file
    if (-not (Test-Path $ENV_FILE)) {
        Write-Log "Environment file $ENV_FILE not found. Copy .env.example and configure it." "ERROR"
        exit 1
    }
    
    # Check disk space (minimum 10GB)
    $availableSpace = (Get-WmiObject -Class Win32_LogicalDisk | Where-Object { $_.DeviceID -eq "C:" }).FreeSpace / 1GB
    if ($availableSpace -lt 10) {
        Write-Log "Low disk space. At least 10GB recommended for deployment." "WARNING"
    }
    
    Write-Log "Environment validation passed" "SUCCESS"
}

function Backup-Data {
    Write-Log "Creating backup of existing data..."
    
    $backupDir = "backups\$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    
    # Check if postgres container is running
    $postgresRunning = docker-compose ps postgres | Select-String "Up"
    if ($postgresRunning) {
        Write-Log "Backing up PostgreSQL database..."
        docker-compose exec -T postgres pg_dump -U website_builder website_builder > "$backupDir\database.sql"
        Write-Log "Database backup created: $backupDir\database.sql" "SUCCESS"
    }
    
    # Backup volumes if they exist
    if (Test-Path "docker_volumes") {
        Write-Log "Backing up Docker volumes..."
        Compress-Archive -Path "docker_volumes" -DestinationPath "$backupDir\volumes.zip"
        Write-Log "Volumes backup created: $backupDir\volumes.zip" "SUCCESS"
    }
    
    Write-Log "Backup completed: $backupDir" "SUCCESS"
    return $backupDir
}

function Update-Code {
    Write-Log "Updating code from repository..."
    
    # Pull latest changes
    git fetch origin
    git pull origin main
    
    # Update submodules (if any)
    git submodule update --init --recursive
    
    Write-Log "Code updated to latest version" "SUCCESS"
}

function Deploy-Services {
    Write-Log "Building and deploying services..."
    
    # Stop existing services
    docker-compose down
    
    # Build images
    Write-Log "Building Docker images..."
    docker-compose build --no-cache
    
    # Start services
    Write-Log "Starting services..."
    docker-compose up -d
    
    # Wait for services to be ready
    Write-Log "Waiting for services to start..."
    Start-Sleep -Seconds 30
    
    Write-Log "Services deployed successfully" "SUCCESS"
}

function Run-Migrations {
    Write-Log "Running database migrations..."
    
    # Wait for database to be ready
    Write-Log "Waiting for database to be ready..."
    docker-compose exec backend npx prisma migrate deploy
    
    # Seed database if needed
    $seedDb = $env:SEED_DATABASE
    if ($seedDb -eq "true") {
        Write-Log "Seeding database..."
        docker-compose exec backend npm run db:seed
    }
    
    Write-Log "Database migrations completed" "SUCCESS"
}

function Setup-SSL {
    Write-Log "Setting up SSL certificates..."
    
    $sslEnabled = $env:SSL_ENABLED
    $domain = $env:DOMAIN
    
    if ($sslEnabled -eq "true" -and $domain) {
        Write-Log "Generating SSL certificate for $domain..."
        
        # Create SSL directory
        New-Item -ItemType Directory -Path "nginx\ssl" -Force | Out-Null
        
        # Generate self-signed certificate for development
        if ($env:NODE_ENV -ne "production") {
            $subject = "/C=US/ST=State/L=City/O=Organization/CN=$domain"
            openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout "nginx\ssl\key.pem" -out "nginx\ssl\cert.pem" -subj $subject
            Write-Log "Self-signed SSL certificate generated" "SUCCESS"
        }
    } else {
        Write-Log "SSL not configured. Set SSL_ENABLED=true and DOMAIN in .env for SSL setup" "WARNING"
    }
}

function Test-Health {
    Write-Log "Running health checks..."
    
    # Define services and their health check URLs
    $services = @{
        "Frontend" = "http://localhost/"
        "Backend" = "http://localhost/api/health"
        "AI Engine" = "http://localhost:3002/health"
        "Hugo Generator" = "http://localhost:3003/health"
    }
    
    # Wait for services to fully start
    Start-Sleep -Seconds 15
    
    $failedServices = @()
    
    foreach ($service in $services.GetEnumerator()) {
        Write-Log "Checking $($service.Key) at $($service.Value)..."
        
        try {
            $response = Invoke-WebRequest -Uri $service.Value -UseBasicParsing -TimeoutSec 10
            if ($response.StatusCode -eq 200) {
                Write-Log "$($service.Key) is healthy" "SUCCESS"
            } else {
                Write-Log "$($service.Key) health check failed" "ERROR"
                $failedServices += $service.Key
            }
        } catch {
            Write-Log "$($service.Key) health check failed: $($_.Exception.Message)" "ERROR"
            $failedServices += $service.Key
        }
    }
    
    if ($failedServices.Count -gt 0) {
        Write-Log "Health checks failed for: $($failedServices -join ', ')" "ERROR"
        exit 1
    }
    
    Write-Log "All health checks passed" "SUCCESS"
}

function Invoke-PostDeployment {
    Write-Log "Running post-deployment tasks..."
    
    # Download Ollama models
    Write-Log "Downloading AI models..."
    docker-compose exec ollama ollama pull llama3:8b
    docker-compose exec ollama ollama pull mistral:7b
    
    # Cleanup old Docker images
    Write-Log "Cleaning up old Docker images..."
    docker image prune -f
    
    Write-Log "Post-deployment tasks completed" "SUCCESS"
}

function Invoke-Rollback {
    param([string]$BackupPath)
    
    if (-not $BackupPath) {
        Write-Log "Backup directory not specified for rollback" "ERROR"
        exit 1
    }
    
    Write-Log "Rolling back to backup: $BackupPath" "WARNING"
    
    # Stop current services
    docker-compose down
    
    # Restore database
    if (Test-Path "$BackupPath\database.sql") {
        Write-Log "Restoring database..."
        docker-compose up -d postgres
        Start-Sleep -Seconds 10
        Get-Content "$BackupPath\database.sql" | docker-compose exec -T postgres psql -U website_builder -d website_builder
    }
    
    # Restore volumes
    if (Test-Path "$BackupPath\volumes.zip") {
        Write-Log "Restoring volumes..."
        Expand-Archive -Path "$BackupPath\volumes.zip" -DestinationPath "." -Force
    }
    
    # Start services
    docker-compose up -d
    
    Write-Log "Rollback completed" "SUCCESS"
}

function Deploy-Production {
    Write-Log "🚀 Starting production deployment..." "INFO"
    
    # Step 1: Validate environment
    Test-Prerequisites
    
    # Step 2: Backup existing data
    $backupDir = Backup-Data
    
    # Step 3: Pull latest code
    Update-Code
    
    # Step 4: Build and deploy services
    Deploy-Services
    
    # Step 5: Run database migrations
    Run-Migrations
    
    # Step 6: Setup SSL certificates
    Setup-SSL
    
    # Step 7: Health checks
    Test-Health
    
    # Step 8: Post-deployment tasks
    Invoke-PostDeployment
    
    Write-Log "🎉 Production deployment completed successfully!" "SUCCESS"
}

# Main execution
switch ($Action) {
    "deploy" {
        Deploy-Production
    }
    "rollback" {
        Invoke-Rollback -BackupPath $BackupDir
    }
    "health" {
        Test-Health
    }
    "backup" {
        Backup-Data
    }
    default {
        Write-Host "Usage: .\deploy.ps1 {deploy|rollback|health|backup}"
        Write-Host "  deploy           - Full production deployment"
        Write-Host "  rollback <dir>   - Rollback to specific backup"
        Write-Host "  health          - Run health checks"
        Write-Host "  backup          - Create backup only"
        exit 1
    }
}
