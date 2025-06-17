#!/bin/bash
# Network Troubleshooting Script for Unix/Linux/macOS
# Run this script to diagnose connectivity issues between frontend and backend services

echo "🔍 Website Builder - Network Diagnostics"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to test port connectivity
test_port() {
    local host=$1
    local port=$2
    local service_name=$3
    
    echo -e "\n${YELLOW}🔌 Testing $service_name ($host:$port)...${NC}"
    
    if timeout 5 bash -c "</dev/tcp/$host/$port" 2>/dev/null; then
        echo -e "${GREEN}✅ $service_name is reachable on port $port${NC}"
        return 0
    else
        echo -e "${RED}❌ $service_name is NOT reachable on port $port${NC}"
        return 1
    fi
}

# Function to test HTTP endpoint
test_http_endpoint() {
    local url=$1
    local service_name=$2
    
    echo -e "\n${YELLOW}🌐 Testing HTTP endpoint: $url${NC}"
    
    if curl -s --connect-timeout 5 --max-time 10 "$url" > /dev/null; then
        echo -e "${GREEN}✅ $service_name HTTP endpoint is responding${NC}"
        return 0
    else
        echo -e "${RED}❌ $service_name HTTP endpoint failed${NC}"
        return 1
    fi
}

# Function to check what's running on a port
check_port_process() {
    local port=$1
    
    if command -v lsof >/dev/null 2>&1; then
        local process=$(lsof -ti:$port 2>/dev/null | head -1)
        if [ ! -z "$process" ]; then
            local process_name=$(ps -p $process -o comm= 2>/dev/null)
            echo "   Process running on port $port: $process_name (PID: $process)"
        fi
    elif command -v netstat >/dev/null 2>&1; then
        netstat -tulpn 2>/dev/null | grep ":$port " | head -1
    fi
}

echo -e "\n${CYAN}📋 System Information:${NC}"
echo "OS: $(uname -s)"
echo "Hostname: $(hostname)"
echo "User: $(whoami)"
echo "Shell: $SHELL"

# Test localhost resolution
echo -e "\n${YELLOW}🔍 Testing localhost resolution...${NC}"
if ping -c 1 localhost >/dev/null 2>&1; then
    echo -e "${GREEN}✅ localhost is reachable${NC}"
else
    echo -e "${RED}❌ localhost resolution failed${NC}"
fi

# Test network connectivity to common ports
echo -e "\n${CYAN}🔌 Port Connectivity Tests:${NC}"
declare -a services=(
    "Frontend (Vite):localhost:3000"
    "Backend (Express):localhost:3001"
    "AI Engine (FastAPI):localhost:3002"
    "Hugo Generator:localhost:3003"
)

port_results=()
for service in "${services[@]}"; do
    IFS=':' read -ra ADDR <<< "$service"
    service_name="${ADDR[0]}"
    host="${ADDR[1]}"
    port="${ADDR[2]}"
    
    if test_port "$host" "$port" "$service_name"; then
        port_results+=("1")
        check_port_process "$port"
    else
        port_results+=("0")
    fi
done

# Test HTTP endpoints
echo -e "\n${CYAN}🌐 HTTP Endpoint Tests:${NC}"
declare -a endpoints=(
    "Backend Health:http://localhost:3001/health"
    "Backend API Status:http://localhost:3001/api/status"
    "AI Engine Health:http://localhost:3002/health"
    "Hugo Generator Health:http://localhost:3003/health"
)

http_results=()
for endpoint in "${endpoints[@]}"; do
    IFS=':' read -ra ADDR <<< "$endpoint"
    service_name="${ADDR[0]}"
    url="${ADDR[1]}:${ADDR[2]}"
    
    if test_http_endpoint "$url" "$service_name"; then
        http_results+=("1")
    else
        http_results+=("0")
    fi
done

# Test CORS with a simple request
echo -e "\n${CYAN}🔗 CORS Test:${NC}"
if curl -s -X OPTIONS \
    -H "Origin: http://localhost:3000" \
    -H "Access-Control-Request-Method: GET" \
    -H "Access-Control-Request-Headers: Content-Type" \
    --connect-timeout 5 \
    "http://localhost:3001/api/status" >/dev/null; then
    echo -e "${GREEN}✅ CORS preflight request successful${NC}"
else
    echo -e "${RED}❌ CORS preflight request failed${NC}"
fi

# Calculate results
total_ports=${#port_results[@]}
online_ports=0
for result in "${port_results[@]}"; do
    if [ "$result" = "1" ]; then
        ((online_ports++))
    fi
done

total_http=${#http_results[@]}
online_http=0
for result in "${http_results[@]}"; do
    if [ "$result" = "1" ]; then
        ((online_http++))
    fi
done

# Summary
echo -e "\n${CYAN}📊 Summary:${NC}"
echo "=========="
echo "Port Connectivity: $online_ports/$total_ports services reachable"
echo "HTTP Endpoints: $online_http/$total_http endpoints responding"

if [ "$online_ports" -eq "$total_ports" ] && [ "$online_http" -eq "$total_http" ]; then
    echo -e "\n${GREEN}🎉 All services are running correctly!${NC}"
else
    echo -e "\n${RED}🚨 Some services are not running properly.${NC}"
    echo -e "\n${YELLOW}💡 Troubleshooting Steps:${NC}"
    echo "1. Make sure all services are started:"
    echo "   - Frontend: cd frontend && npm run dev"
    echo "   - Backend: cd backend && npm run dev"
    echo "   - AI Engine: cd ai-engine && python main.py"
    echo "   - Hugo Generator: cd hugo-generator && npm run dev"
    echo "2. Check for port conflicts with: lsof -i :3001 (or netstat -tulpn | grep :3001)"
    echo "3. Verify firewall isn't blocking the ports"
    echo "4. Try restarting the services"
fi

echo -e "\n${CYAN}🔧 Environment Check:${NC}"
if [ -f "frontend/.env" ]; then
    echo -e "${GREEN}✅ Frontend .env file exists${NC}"
else
    echo -e "${RED}❌ Frontend .env file missing${NC}"
fi

if [ -f "backend/.env" ]; then
    echo -e "${GREEN}✅ Backend .env file exists${NC}"
else
    echo -e "${RED}❌ Backend .env file missing${NC}"
fi

echo -e "\nDiagnostics completed at $(date)"
