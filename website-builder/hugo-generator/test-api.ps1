$body = Get-Content -Path "test-generation.json" -Raw
$response = Invoke-RestMethod -Uri "http://localhost:3003/api/generation/generate" -Method POST -ContentType "application/json" -Body $body
$response | ConvertTo-Json -Depth 10
