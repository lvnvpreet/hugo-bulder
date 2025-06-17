$env:NODE_ENV = "development"

Write-Host "Running Project Generation Test..." -ForegroundColor Cyan

cd $PSScriptRoot
cd ..

Write-Host "Running test script..." -ForegroundColor Green
node ./scripts/test-project-generation.js
