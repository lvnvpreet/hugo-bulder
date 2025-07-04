# Hugo Builder - Service Status Check Script
# This script checks the status of all Hugo Builder services

Write-Host "📊 Hugo Builder Service Status" -ForegroundColor Green
Write-Host "==============================" -ForegroundColor Cyan

# Function to check if a port is in use
function Test-Port {
    param([int]$Port)
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("localhost", $Port)
        $connection.Close()
        return $true
    }
    catch {
        return $false
    }
}

# Function to get response from HTTP endpoint
function Test-HttpEndpoint {
    param([string]$Url)
    try {
        $response = Invoke-WebRequest -Uri $Url -TimeoutSec 5 -ErrorAction Stop
        return $response.StatusCode -eq 200
    }
    catch {
        return $false
    }
}

# Check Docker status
Write-Host "`n🐳 Docker Status:" -ForegroundColor Blue
try {
    docker version | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor Green
    
    # Check Docker containers
    Write-Host "`n📦 Docker Containers:" -ForegroundColor Blue
    $containers = docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | Out-String
    if ($containers -match "website-builder") {
        Write-Host $containers
    } else {
        Write-Host "❌ No Hugo Builder containers running" -ForegroundColor Red
    }
}
catch {
    Write-Host "❌ Docker is not running" -ForegroundColor Red
}

# Check service status
Write-Host "`n🌐 Service Endpoints:" -ForegroundColor Blue
Write-Host "--------------------"

$services = @(
    @{Name="Database (PostgreSQL)"; Port=5432; Url=$null; Type="Database"},
    @{Name="Frontend"; Port=3000; Url="http://localhost:3000"; Type="Web"},
    @{Name="Frontend (Dev)"; Port=5173; Url="http://localhost:5173"; Type="Web"},
    @{Name="Backend API"; Port=3001; Url="http://localhost:3001/health"; Type="API"},
    @{Name="Hugo Generator"; Port=3002; Url="http://localhost:3002/health"; Type="API"},
    @{Name="AI Engine"; Port=8001; Url="http://localhost:8001/health"; Type="API"},
    @{Name="Nginx"; Port=80; Url="http://localhost"; Type="Web"}
)

foreach ($service in $services) {
    $portStatus = Test-Port -Port $service.Port
    $portIcon = if ($portStatus) { "✅" } else { "❌" }
    
    $httpStatus = $false
    $httpIcon = ""
    
    if ($service.Url -and $portStatus) {
        $httpStatus = Test-HttpEndpoint -Url $service.Url
        $httpIcon = if ($httpStatus) { "✅" } else { "⚠️ " }
    }
    
    $statusText = $service.Name.PadRight(20)
    $portText = "Port $($service.Port): $portIcon"
    
    if ($service.Url) {
        $httpText = "HTTP: $httpIcon"
        Write-Host "$statusText $portText $httpText" -ForegroundColor $(if ($portStatus -and $httpStatus) { "Green" } elseif ($portStatus) { "Yellow" } else { "Red" })
    } else {
        Write-Host "$statusText $portText" -ForegroundColor $(if ($portStatus) { "Green" } else { "Red" })
    }
}

# Check for processes
Write-Host "`n🔧 Running Processes:" -ForegroundColor Blue
Write-Host "--------------------"

$processNames = @("node", "python", "hugo", "nginx")
$foundProcesses = $false

foreach ($processName in $processNames) {
    try {
        $processes = Get-Process -Name $processName -ErrorAction SilentlyContinue | 
                    Where-Object { 
                        $_.Path -like "*hugo-bulder*" -or 
                        $_.CommandLine -like "*hugo-bulder*" -or
                        $_.CommandLine -like "*uvicorn*" -or
                        $_.CommandLine -like "*vite*"
                    }
        
        if ($processes) {
            $foundProcesses = $true
            foreach ($process in $processes) {
                $commandLine = try { $process.CommandLine } catch { "N/A" }
                Write-Host "✅ $($process.ProcessName) (PID: $($process.Id))" -ForegroundColor Green
                if ($commandLine -ne "N/A" -and $commandLine.Length -lt 100) {
                    Write-Host "   Command: $commandLine" -ForegroundColor Gray
                }
            }
        }
    }
    catch {
        # Ignore errors
    }
}

if (!$foundProcesses) {
    Write-Host "❌ No Hugo Builder processes found" -ForegroundColor Red
}

# Quick access URLs
Write-Host "`n🔗 Quick Access URLs:" -ForegroundColor Cyan
Write-Host "--------------------"
$urls = @(
    @{Name="Main Application"; Url="http://localhost:3000"},
    @{Name="Development Mode"; Url="http://localhost:5173"},
    @{Name="Backend API Docs"; Url="http://localhost:3001/api-docs"},
    @{Name="AI Engine Docs"; Url="http://localhost:8001/docs"}
)

foreach ($url in $urls) {
    $available = ""
    if ($url.Url -match ":(\d+)") {
        $port = [int]$Matches[1]
        $available = if (Test-Port -Port $port) { " ✅" } else { " ❌" }
    }
    Write-Host "$($url.Name.PadRight(20)) $($url.Url)$available" -ForegroundColor White
}

Write-Host "`n💡 Management Commands:" -ForegroundColor Cyan
Write-Host "----------------------"
Write-Host "• Start all services:      .\start-all-services.ps1" -ForegroundColor White
Write-Host "• Start dev mode:          .\start-dev.ps1" -ForegroundColor White
Write-Host "• Stop all services:       .\stop-all-services.ps1" -ForegroundColor White
Write-Host "• Check status:            .\status.ps1" -ForegroundColor White
