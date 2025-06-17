# Website Builder - Start All Services (Windows PowerShell)
# This script starts all services in the correct order with proper error handling

Write-Host "🚀 Starting Website Builder Services..." -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Configuration
$services = @(
    @{
        Name = "Backend (Express)"
        Path = "backend"
        Command = "npm run dev"
        Port = 3001
        HealthCheck = "http://localhost:3001/health"
        WaitTime = 5
    },
    @{
        Name = "AI Engine (FastAPI)"
        Path = "ai-engine"
        Command = "python main.py"
        Port = 3002
        HealthCheck = "http://localhost:3002/health"
        WaitTime = 10
    },
    @{
        Name = "Hugo Generator"
        Path = "hugo-generator"
        Command = "npm run dev"
        Port = 3003
        HealthCheck = "http://localhost:3003/health"
        WaitTime = 5
    },
    @{
        Name = "Frontend (Vite)"
        Path = "frontend"
        Command = "npm run dev"
        Port = 3000
        HealthCheck = "http://localhost:3000"
        WaitTime = 5
    }
)

# Function to check if port is in use
function Test-PortInUse {
    param([int]$Port)
    
    try {
        $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        return $connection -ne $null
    } catch {
        return $false
    }
}

# Function to wait for service to be ready
function Wait-ForService {
    param(
        [string]$Url,
        [int]$TimeoutSeconds = 30,
        [string]$ServiceName
    )
    
    Write-Host "⏳ Waiting for $ServiceName to be ready..." -ForegroundColor Yellow
    
    $startTime = Get-Date
    while ((Get-Date) - $startTime).TotalSeconds -lt $TimeoutSeconds) {
        try {
            $response = Invoke-WebRequest -Uri $Url -TimeoutSec 2 -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                Write-Host "✅ $ServiceName is ready!" -ForegroundColor Green
                return $true
            }
        } catch {
            # Service not ready yet, continue waiting
        }
        
        Start-Sleep -Seconds 1
    }
    
    Write-Host "⚠️ $ServiceName took too long to start" -ForegroundColor Red
    return $false
}

# Check if we're in the correct directory
if (-not (Test-Path "package.json") -or -not (Test-Path "frontend") -or -not (Test-Path "backend")) {
    Write-Host "❌ Please run this script from the website-builder root directory" -ForegroundColor Red
    exit 1
}

# Check for required files
$requiredFiles = @("frontend/.env", "backend/.env")
foreach ($file in $requiredFiles) {
    if (-not (Test-Path $file)) {
        Write-Host "⚠️ Missing required file: $file" -ForegroundColor Yellow
        Write-Host "   This may cause configuration issues." -ForegroundColor Yellow
    }
}

# Start services
$startedServices = @()

foreach ($service in $services) {
    Write-Host "`n🔄 Starting $($service.Name)..." -ForegroundColor Cyan
    
    # Check if port is already in use
    if (Test-PortInUse -Port $service.Port) {
        Write-Host "⚠️ Port $($service.Port) is already in use. Service may already be running." -ForegroundColor Yellow
        
        # Try to check if it's our service
        try {
            $response = Invoke-WebRequest -Uri $service.HealthCheck -TimeoutSec 2 -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                Write-Host "✅ $($service.Name) is already running and healthy!" -ForegroundColor Green
                continue
            }
        } catch {
            Write-Host "❌ Port $($service.Port) is occupied by another process" -ForegroundColor Red
            Write-Host "   Please stop the process using port $($service.Port) or change the port" -ForegroundColor Red
            continue
        }
    }
    
    # Change to service directory
    if (-not (Test-Path $service.Path)) {
        Write-Host "❌ Service directory not found: $($service.Path)" -ForegroundColor Red
        continue
    }
    
    # Start the service in a new window
    try {
        $processInfo = Start-Process -FilePath "powershell" -ArgumentList @(
            "-NoExit",
            "-Command", 
            "cd '$($service.Path)'; Write-Host 'Starting $($service.Name)...' -ForegroundColor Green; $($service.Command)"
        ) -PassThru
        
        $startedServices += @{
            Service = $service
            Process = $processInfo
        }
        
        Write-Host "✅ $($service.Name) started (PID: $($processInfo.Id))" -ForegroundColor Green
        
        # Wait for service to be ready
        Start-Sleep -Seconds $service.WaitTime
        
        if ($service.HealthCheck) {
            $isReady = Wait-ForService -Url $service.HealthCheck -ServiceName $service.Name -TimeoutSeconds 30
            if (-not $isReady) {
                Write-Host "⚠️ $($service.Name) may not have started correctly" -ForegroundColor Yellow
            }
        }
        
    } catch {
        Write-Host "❌ Failed to start $($service.Name): $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Final status check
Write-Host "`n📊 Service Status Check:" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan

foreach ($service in $services) {
    Write-Host "`n🔍 Checking $($service.Name)..." -ForegroundColor Yellow
    
    if (Test-PortInUse -Port $service.Port) {
        Write-Host "✅ Port $($service.Port) is active" -ForegroundColor Green
        
        if ($service.HealthCheck) {
            try {
                $response = Invoke-WebRequest -Uri $service.HealthCheck -TimeoutSec 5 -UseBasicParsing
                Write-Host "✅ Health check passed (Status: $($response.StatusCode))" -ForegroundColor Green
            } catch {
                Write-Host "⚠️ Health check failed: $($_.Exception.Message)" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "❌ Port $($service.Port) is not active" -ForegroundColor Red
    }
}

Write-Host "`n🎉 Service startup complete!" -ForegroundColor Green
Write-Host "============================" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Backend API: http://localhost:3001/api" -ForegroundColor Cyan
Write-Host "Backend Health: http://localhost:3001/health" -ForegroundColor Cyan
Write-Host "AI Engine: http://localhost:3002" -ForegroundColor Cyan
Write-Host "Hugo Generator: http://localhost:3003" -ForegroundColor Cyan

Write-Host "`n💡 Tips:" -ForegroundColor Yellow
Write-Host "- Use Ctrl+C in each service window to stop individual services"
Write-Host "- Check the Service Health Dashboard in the frontend for real-time status"
Write-Host "- Run './scripts/network-diagnostics.ps1' if you encounter issues"

Write-Host "`nPress any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
