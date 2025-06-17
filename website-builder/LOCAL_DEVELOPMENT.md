# Website Builder - Local Development Setup

This guide helps you set up and troubleshoot the Website Builder application for local development.

## 🏗️ Architecture

The application consists of 4 services running locally:

- **Frontend**: React + Vite on `http://localhost:3000`
- **Backend**: Node.js + Express on `http://localhost:3001`
- **AI Engine**: Python FastAPI on `http://localhost:3002`
- **Hugo Generator**: Node.js on `http://localhost:3003`

## 🚀 Quick Start

### 1. Automated Setup (Recommended)

```powershell
# Windows PowerShell
.\scripts\start-all-services.ps1
```

```bash
# Unix/Linux/macOS
chmod +x ./scripts/start-all-services.sh
./scripts/start-all-services.sh
```

### 2. Manual Setup

#### Prerequisites
- Node.js 18+ and npm
- Python 3.8+ (for AI Engine)
- PostgreSQL (for backend database)

#### Start each service:

```bash
# 1. Backend (Terminal 1)
cd backend
npm install
npm run dev

# 2. AI Engine (Terminal 2)
cd ai-engine
pip install -r requirements.txt
python main.py

# 3. Hugo Generator (Terminal 3)
cd hugo-generator
npm install
npm run dev

# 4. Frontend (Terminal 4)
cd frontend
npm install
npm run dev
```

## 🔧 Configuration

### Environment Files

**Frontend (.env)**
```bash
VITE_API_URL=http://localhost:3001/api
VITE_BACKEND_URL=http://localhost:3001
VITE_AI_ENGINE_URL=http://localhost:3002
VITE_HUGO_GENERATOR_URL=http://localhost:3003
VITE_ENABLE_SERVICE_MONITORING=true
```

**Backend (.env)**
```bash
NODE_ENV=development
PORT=3001
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:5173,http://localhost:4173"
DATABASE_URL="postgresql://username:password@localhost:5432/website_builder_dev"
JWT_SECRET="your-secret-key"
```

### CORS Configuration

The backend is configured to allow requests from:
- `http://localhost:3000` (Frontend dev server)
- `http://localhost:5173` (Vite dev server)
- `http://localhost:4173` (Vite preview server)

## 🔍 Troubleshooting

### 1. Automated Diagnostics

```powershell
# Windows
.\scripts\network-diagnostics.ps1

# Unix/Linux/macOS
chmod +x ./scripts/network-diagnostics.sh
./scripts/network-diagnostics.sh
```

### 2. Service Health Dashboard

Visit `http://localhost:3000/diagnostics` for real-time service monitoring.

### 3. Connection Testing

```bash
# Test frontend connection
cd frontend
npm run test:connection
```

### 4. Common Issues

#### "Cannot connect to backend server"
- **Check**: Backend is running on port 3001
- **Fix**: `cd backend && npm run dev`
- **Verify**: Visit `http://localhost:3001/health`

#### "CORS Error"
- **Check**: Frontend origin is in ALLOWED_ORIGINS
- **Fix**: Update backend `.env` file
- **Verify**: Check browser network tab for CORS headers

#### "Port already in use"
- **Check**: `netstat -an | findstr :3001` (Windows) or `lsof -i :3001` (Unix)
- **Fix**: Kill the process or change the port

#### "Service not found"
- **Check**: All services are running
- **Fix**: Start services in order: Backend → AI Engine → Hugo Generator → Frontend

## 🌐 Service URLs

When everything is running correctly:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api
- **Backend Health**: http://localhost:3001/health
- **AI Engine**: http://localhost:3002
- **Hugo Generator**: http://localhost:3003
- **Diagnostics**: http://localhost:3000/diagnostics

## 🔧 API Configuration

### Request Flow
```
Frontend (3000) → Backend API (3001) → AI Engine (3002)
                                    → Hugo Generator (3003)
```

### Error Handling
The frontend includes comprehensive error handling:
- Automatic retry on network failures
- CORS error detection and reporting
- Service health monitoring
- Fallback strategies for service unavailability

### Authentication
- JWT tokens stored in localStorage
- Automatic token injection in API requests
- Token refresh on 401 errors

## 🚨 Emergency Fixes

### Reset Everything
```bash
# Kill all Node.js processes
pkill -f node

# Restart in correct order
cd backend && npm run dev &
cd ai-engine && python main.py &
cd hugo-generator && npm run dev &
cd frontend && npm run dev
```

### Clear Browser Data
1. Open DevTools (F12)
2. Application tab → Storage → Clear site data
3. Refresh the page

### Reset Database
```bash
cd backend
npm run db:reset
```

## 📊 Monitoring

### Service Health
- Visit `/diagnostics` in the frontend
- Check browser console for detailed logs
- Monitor response times and error rates

### Network Requests
- All API requests are logged in development
- Request IDs for tracing
- Automatic retry logic with exponential backoff

## 🛠️ Development Tools

### Scripts
- `npm run diagnostics` - Check environment configuration
- `npm run test:connection` - Test API connectivity
- `.\scripts\network-diagnostics.ps1` - Full system diagnostics

### Debugging
- Environment variables logged on startup
- Service health automatically monitored
- Real-time status updates in diagnostics dashboard

## ❓ Need Help?

1. Check the diagnostics page: `http://localhost:3000/diagnostics`
2. Run network diagnostics script
3. Check browser console for errors
4. Verify all .env files are configured correctly
5. Ensure all services are running on correct ports

## 🔄 Service Restart Commands

```bash
# Individual services
npm run dev          # Frontend
npm run dev          # Backend
python main.py       # AI Engine
npm run dev          # Hugo Generator

# Check service status
curl http://localhost:3001/health    # Backend
curl http://localhost:3002/health    # AI Engine
curl http://localhost:3003/health    # Hugo Generator
```
