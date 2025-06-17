# Network Troubleshooting Script for Windows
# Run this script to diagnose connectivity issues between frontend and backend services

Write-Host "🔍 Website Builder - Network Diagnostics" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Function to test port connectivity
function Test-Port {
    param(
        [string]$Host,
        [int]$Port,
        [string]$ServiceName
    )
    
    Write-Host "`n🔌 Testing $ServiceName ($Host`:$Port)..." -ForegroundColor Yellow
    
    try {
        $connection = Test-NetConnection -ComputerName $Host -Port $Port -WarningAction SilentlyContinue
        if ($connection.TcpTestSucceeded) {
            Write-Host "✅ $ServiceName is reachable on port $Port" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ $ServiceName is NOT reachable on port $Port" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ Error testing $ServiceName`: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to test HTTP endpoint
function Test-HttpEndpoint {
    param(
        [string]$Url,
        [string]$ServiceName
    )
    
    Write-Host "`n🌐 Testing HTTP endpoint: $Url" -ForegroundColor Yellow
    
    try {
        $response = Invoke-WebRequest -Uri $Url -TimeoutSec 5 -UseBasicParsing
        Write-Host "✅ $ServiceName HTTP endpoint is responding (Status: $($response.StatusCode))" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "❌ $ServiceName HTTP endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to check if process is running on port
function Get-ProcessOnPort {
    param([int]$Port)
    
    try {
        $process = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | 
                   Select-Object -First 1 | 
                   ForEach-Object { Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue }
        
        if ($process) {
            return $process.ProcessName
        }
    } catch {
        return $null
    }
    return $null
}

Write-Host "`n📋 System Information:" -ForegroundColor Cyan
Write-Host "OS: $($env:OS)"
Write-Host "Computer: $($env:COMPUTERNAME)"
Write-Host "User: $($env:USERNAME)"
Write-Host "PowerShell Version: $($PSVersionTable.PSVersion)"

# Test localhost resolution
Write-Host "`n🔍 Testing localhost resolution..." -ForegroundColor Yellow
try {
    $localhost = [System.Net.Dns]::GetHostAddresses("localhost")
    Write-Host "✅ localhost resolves to: $($localhost -join ', ')" -ForegroundColor Green
} catch {
    Write-Host "❌ localhost resolution failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test network connectivity to common ports
$services = @(
    @{ Name = "Frontend (Vite)"; Host = "localhost"; Port = 3000 },
    @{ Name = "Backend (Express)"; Host = "localhost"; Port = 3001 },
    @{ Name = "AI Engine (FastAPI)"; Host = "localhost"; Port = 3002 },
    @{ Name = "Hugo Generator"; Host = "localhost"; Port = 3003 }
)

Write-Host "`n🔌 Port Connectivity Tests:" -ForegroundColor Cyan
$portResults = @{}
foreach ($service in $services) {
    $result = Test-Port -Host $service.Host -Port $service.Port -ServiceName $service.Name
    $portResults[$service.Port] = $result
    
    if ($result) {
        $processName = Get-ProcessOnPort -Port $service.Port
        if ($processName) {
            Write-Host "   Process running on port $($service.Port): $processName" -ForegroundColor Gray
        }
    }
}

# Test HTTP endpoints
Write-Host "`n🌐 HTTP Endpoint Tests:" -ForegroundColor Cyan
$httpEndpoints = @(
    @{ Url = "http://localhost:3001/health"; Name = "Backend Health" },
    @{ Url = "http://localhost:3001/api/status"; Name = "Backend API Status" },
    @{ Url = "http://localhost:3002/health"; Name = "AI Engine Health" },
    @{ Url = "http://localhost:3003/health"; Name = "Hugo Generator Health" }
)

$httpResults = @{}
foreach ($endpoint in $httpEndpoints) {
    $result = Test-HttpEndpoint -Url $endpoint.Url -ServiceName $endpoint.Name
    $httpResults[$endpoint.Name] = $result
}

# Test CORS with a simple request
Write-Host "`n🔗 CORS Test:" -ForegroundColor Cyan
try {
    $headers = @{
        "Origin" = "http://localhost:3000"
        "Access-Control-Request-Method" = "GET"
        "Access-Control-Request-Headers" = "Content-Type"
    }
    
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/status" -Headers $headers -Method OPTIONS -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ CORS preflight request successful" -ForegroundColor Green
} catch {
    Write-Host "❌ CORS preflight request failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Summary
Write-Host "`n📊 Summary:" -ForegroundColor Cyan
Write-Host "==========" -ForegroundColor Cyan

$totalPorts = $portResults.Count
$onlinePorts = ($portResults.Values | Where-Object { $_ -eq $true }).Count
$totalHttp = $httpResults.Count  
$onlineHttp = ($httpResults.Values | Where-Object { $_ -eq $true }).Count

Write-Host "Port Connectivity: $onlinePorts/$totalPorts services reachable"
Write-Host "HTTP Endpoints: $onlineHttp/$totalHttp endpoints responding"

if ($onlinePorts -eq $totalPorts -and $onlineHttp -eq $totalHttp) {
    Write-Host "`n🎉 All services are running correctly!" -ForegroundColor Green
} else {
    Write-Host "`n🚨 Some services are not running properly." -ForegroundColor Red
    Write-Host "`n💡 Troubleshooting Steps:" -ForegroundColor Yellow
    Write-Host "1. Make sure all services are started:"
    Write-Host "   - Frontend: cd frontend && npm run dev"
    Write-Host "   - Backend: cd backend && npm run dev"
    Write-Host "   - AI Engine: cd ai-engine && python main.py"
    Write-Host "   - Hugo Generator: cd hugo-generator && npm run dev"
    Write-Host "2. Check for port conflicts with: netstat -an | findstr :3001"
    Write-Host "3. Verify firewall/antivirus isn't blocking the ports"
    Write-Host "4. Try restarting the services"
}

Write-Host "`n🔧 Environment Check:" -ForegroundColor Cyan
if (Test-Path "frontend\.env") {
    Write-Host "✅ Frontend .env file exists" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend .env file missing" -ForegroundColor Red
}

if (Test-Path "backend\.env") {
    Write-Host "✅ Backend .env file exists" -ForegroundColor Green
} else {
    Write-Host "❌ Backend .env file missing" -ForegroundColor Red
}

Write-Host "`nDiagnostics completed at $(Get-Date)" -ForegroundColor Cyan
