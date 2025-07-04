# Hugo Builder - Stop All Services Script
# This script stops all running Hugo Builder services

Write-Host "🛑 Stopping Hugo Builder Services..." -ForegroundColor Red
Write-Host "=====================================" -ForegroundColor Cyan

# Change to website-builder directory
Set-Location "website-builder"

# Stop Docker services
Write-Host "`n📦 Stopping Docker Services..." -ForegroundColor Blue
Write-Host "-------------------------------"

try {
    docker-compose down
    Write-Host "✅ Docker services stopped successfully" -ForegroundColor Green
}
catch {
    Write-Host "⚠️  Error stopping Docker services: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Stop any Node.js processes running on our ports
Write-Host "`n🔧 Stopping Node.js Services..." -ForegroundColor Blue
Write-Host "-------------------------------"

$ports = @(3000, 3001, 3002, 5173, 8001)
foreach ($port in $ports) {
    try {
        $processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | 
                    Select-Object -ExpandProperty OwningProcess | 
                    ForEach-Object { Get-Process -Id $_ -ErrorAction SilentlyContinue }
        
        if ($processes) {
            foreach ($process in $processes) {
                Write-Host "Stopping process $($process.ProcessName) (PID: $($process.Id)) on port $port"
                Stop-Process -Id $process.Id -Force
            }
            Write-Host "✅ Stopped services on port $port" -ForegroundColor Green
        }
    }
    catch {
        # Ignore errors - port might not be in use
    }
}

# Clean up any remaining Hugo Builder processes
Write-Host "`n🧹 Cleaning up remaining processes..." -ForegroundColor Blue
Write-Host "-------------------------------"

$processNames = @("node", "npm", "python", "hugo")
foreach ($processName in $processNames) {
    try {
        $processes = Get-Process -Name $processName -ErrorAction SilentlyContinue | 
                    Where-Object { $_.Path -like "*hugo-bulder*" -or $_.CommandLine -like "*hugo-bulder*" }
        
        if ($processes) {
            foreach ($process in $processes) {
                Write-Host "Stopping Hugo Builder process: $($process.ProcessName) (PID: $($process.Id))"
                Stop-Process -Id $process.Id -Force
            }
        }
    }
    catch {
        # Ignore errors
    }
}

Write-Host "`n✅ All Hugo Builder services have been stopped!" -ForegroundColor Green
Write-Host "You can now restart them using .\start-all-services.ps1 or .\start-dev.ps1" -ForegroundColor Yellow
