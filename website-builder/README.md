# 🚀 AI-Powered Website Builder

A comprehensive microservices-based platform for creating websites with AI assistance, built with modern technologies and containerized for easy deployment.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Docker](https://img.shields.io/badge/docker-compose-blue.svg)
![TypeScript](https://img.shields.io/badge/typescript-ready-blue.svg)
![Python](https://img.shields.io/badge/python-3.11+-green.svg)

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend       │    │   AI Engine     │
│  React + TS     │◄──►│  Node.js + TS    │◄──►│  Python FastAPI │
│  Vite + Tailwind│    │  Express + Prisma│    │  LangGraph      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         └────────────────────────▼────────────────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │       Nginx Proxy          │
                    │    Load Balancer           │
                    └─────────────┬──────────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
    ┌─────────▼─────────┐ ┌──────▼──────┐ ┌─────────▼─────────┐
    │  Hugo Generator   │ │ PostgreSQL  │ │   File Storage    │
    │  Node.js + Hugo   │ │  Database   │ │   Generated Sites │
    └───────────────────┘ └─────────────┘ └───────────────────┘
```

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **React Router** for navigation
- **React Query** for state management
- **Framer Motion** for animations

### Backend
- **Node.js** with TypeScript
- **Express.js** web framework
- **Prisma ORM** for database operations
- **JWT** for authentication
- **Multer** for file uploads
- **Winston** for logging

### AI Engine
- **Python 3.11+**
- **FastAPI** for API framework
- **LangGraph** for AI workflows
- **OpenAI GPT-4** for content generation
- **LangChain** for AI orchestration
- **Pydantic** for data validation

### Hugo Generator
- **Node.js** with TypeScript
- **Hugo CLI** for static site generation
- **Express.js** for API endpoints
- **File system** operations

### Infrastructure
- **Docker** & **Docker Compose**
- **Nginx** reverse proxy
- **PostgreSQL** database
- **Redis** (optional) for caching

## 📋 Prerequisites

- **Docker** (v20.10+) and **Docker Compose** (v2.0+)
- **Node.js** (v18+) for local development
- **Python** (v3.11+) for AI engine development
- **Git** for version control

## 🚀 Quick Start

### 1. Clone and Setup

```bash
git clone <repository-url>
cd website-builder
cp .env.example .env
```

### 2. Configure Environment

Edit the `.env` file with your API keys and configuration:

```bash
# Required: OpenAI API Key
OPENAI_API_KEY=your_openai_api_key_here

# Database
DB_PASSWORD=your_secure_password

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key
```

### 3. Start All Services

```bash
# Start all services in development mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **AI Engine**: http://localhost:8000
- **Hugo Generator**: http://localhost:3003
- **Nginx Proxy**: http://localhost

## 📁 Project Structure

```
website-builder/
├── 📁 frontend/                 # React + TypeScript + Vite
│   ├── 📄 Dockerfile
│   ├── 📄 package.json
│   ├── 📄 vite.config.ts
│   ├── 📄 tailwind.config.js
│   └── 📁 src/
│       ├── 📄 App.tsx
│       ├── 📄 main.tsx
│       ├── 📁 components/
│       ├── 📁 pages/
│       ├── 📁 hooks/
│       ├── 📁 services/
│       ├── 📁 types/
│       └── 📁 styles/
├── 📁 backend/                  # Node.js + Express + TypeScript
│   ├── 📄 Dockerfile
│   ├── 📄 package.json
│   ├── 📄 tsconfig.json
│   ├── 📁 prisma/
│   │   ├── 📄 schema.prisma
│   │   └── 📄 seed.ts
│   └── 📁 src/
│       ├── 📄 app.ts
│       ├── 📄 server.ts
│       ├── 📁 routes/
│       ├── 📁 middleware/
│       ├── 📁 services/
│       ├── 📁 types/
│       └── 📁 utils/
├── 📁 ai-engine/               # Python + FastAPI + LangGraph
│   ├── 📄 Dockerfile
│   ├── 📄 requirements.txt
│   ├── 📄 main.py
│   └── 📁 src/
│       ├── 📁 agents/
│       ├── 📁 workflows/
│       ├── 📁 models/
│       └── 📁 utils/
├── 📁 hugo-generator/          # Node.js + Hugo CLI
│   ├── 📄 Dockerfile
│   ├── 📄 package.json
│   ├── 📄 tsconfig.json
│   └── 📁 src/
│       ├── 📄 generator.ts
│       ├── 📁 templates/
│       └── 📁 utils/
├── 📁 nginx/                   # Reverse Proxy
│   ├── 📄 Dockerfile
│   ├── 📄 nginx.conf
│   └── 📁 conf.d/
├── 📁 database/                # Database initialization
│   └── 📄 init.sql
├── 📄 docker-compose.yml       # Multi-service setup
├── 📄 .env.example            # Environment template
├── 📄 .gitignore              # Git ignore rules
└── 📄 README.md               # This file
```

## 🔧 Development

### Local Development Setup

Each service can be run individually for development:

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

#### Backend
```bash
cd backend
npm install
npm run dev
npm run db:push    # Setup database
npm run db:seed    # Seed with sample data
```

#### AI Engine
```bash
cd ai-engine
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8000
```

#### Hugo Generator
```bash
cd hugo-generator
npm install
npm run dev
```

### Database Management

```bash
# Reset database
docker-compose down -v
docker-compose up postgres -d

# Run migrations
cd backend
npm run db:push

# View database
npm run db:studio
```

### Useful Commands

```bash
# View all container logs
docker-compose logs -f

# Restart a specific service
docker-compose restart backend

# Rebuild a service
docker-compose up --build frontend

# Execute commands in container
docker-compose exec backend npm run db:studio
docker-compose exec ai-engine python -c "import sys; print(sys.version)"

# Health checks
curl http://localhost:3001/health
curl http://localhost:8000/health
curl http://localhost:3003/health
```

## 🧪 Testing

```bash
# Frontend tests
cd frontend
npm run test
npm run test:e2e

# Backend tests
cd backend
npm run test
npm run test:integration

# AI Engine tests
cd ai-engine
pytest
pytest --cov=src tests/
```

## 📊 Monitoring & Logs

### Application Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f ai-engine

# Follow logs with timestamps
docker-compose logs -f -t
```

### Health Checks
All services include health check endpoints:
- Frontend: `GET /`
- Backend: `GET /health`
- AI Engine: `GET /health`
- Hugo Generator: `GET /health`

## 🔐 Security

- JWT-based authentication
- CORS protection
- Rate limiting
- Input validation
- Environment variable protection
- Docker security best practices

## 🚢 Deployment

### Production Deployment

1. **Set production environment**:
```bash
export NODE_ENV=production
```

2. **Configure production environment**:
```bash
cp .env.example .env.production
# Edit .env.production with production values
```

3. **Deploy with production configuration**:
```bash
docker-compose -f docker-compose.yml up -d
```

### Environment-Specific Configurations

- **Development**: Full logging, hot reload, dev tools
- **Staging**: Production-like with debug info
- **Production**: Optimized builds, minimal logging, security hardened

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Use TypeScript for all Node.js code
- Follow ESLint and Prettier configurations
- Write tests for new features
- Update documentation for changes
- Use conventional commit messages

## 📄 API Documentation

### Backend API
- **Swagger UI**: http://localhost:3001/api-docs
- **OpenAPI Spec**: http://localhost:3001/api-docs.json

### AI Engine API
- **FastAPI Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🐛 Troubleshooting

### Common Issues

1. **Port conflicts**:
   ```bash
   # Check what's using the port
   netstat -tulpn | grep :3000
   # Change ports in .env file
   ```

2. **Database connection issues**:
   ```bash
   # Check database logs
   docker-compose logs postgres
   # Reset database
   docker-compose down -v
   ```

3. **AI Engine startup issues**:
   ```bash
   # Check Python environment
   docker-compose exec ai-engine python --version
   # Reinstall dependencies
   docker-compose up --build ai-engine
   ```

### Performance Tips

- Use Docker BuildKit for faster builds
- Enable Redis caching for production
- Optimize Docker images with multi-stage builds
- Use nginx for static file serving

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)
- **Wiki**: [Project Wiki](https://github.com/your-repo/wiki)

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Hugo Static Site Generator
- OpenAI for AI capabilities
- All the amazing open-source projects that make this possible

---

**Built with ❤️ by the Website Builder Team**