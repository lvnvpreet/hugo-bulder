# Production Deployment Guide

## Prerequisites

1. **System Requirements**
   - Docker & Docker Compose
   - Git
   - At least 10GB free disk space
   - 4GB+ RAM recommended

2. **Environment Setup**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Edit with your production values
   nano .env
   ```

3. **Required Environment Variables**
   - `POSTGRES_PASSWORD` - Secure database password
   - `JWT_SECRET` - 32+ character secret key
   - `REDIS_PASSWORD` - Redis authentication password
   - `DOMAIN` - Your production domain (for SSL)
   - `SSL_EMAIL` - Email for Let's Encrypt certificates

## Deployment Commands

### Quick Start (Linux/Mac)
```bash
# Make scripts executable
chmod +x scripts/deploy.sh scripts/setup-ssl.sh

# Deploy to production
./scripts/deploy.sh deploy

# Setup SSL (optional)
./scripts/setup-ssl.sh yourdomain.com admin@yourdomain.com
```

### Windows PowerShell
```powershell
# Deploy to production
.\scripts\deploy.ps1 deploy

# Check health
.\scripts\deploy.ps1 health

# Create backup
.\scripts\deploy.ps1 backup
```

## Manual Deployment Steps

1. **Environment Validation**
   ```bash
   docker --version
   docker-compose --version
   ```

2. **Build and Start Services**
   ```bash
   # Stop existing services
   docker-compose down
   
   # Build images
   docker-compose build --no-cache
   
   # Start all services
   docker-compose up -d
   ```

3. **Database Setup**
   ```bash
   # Run migrations
   docker-compose exec backend npx prisma migrate deploy
   
   # Seed database (optional)
   docker-compose exec backend npm run db:seed
   ```

4. **Health Checks**
   ```bash
   # Check service status
   docker-compose ps
   
   # Test endpoints
   curl http://localhost/health
   curl http://localhost/api/health
   curl http://localhost:3002/health
   curl http://localhost:3003/health
   ```

## SSL Certificate Setup

### Development (Self-Signed)
```bash
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
```

### Production (Let's Encrypt)
```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Generate certificate
sudo certbot --nginx -d yourdomain.com --non-interactive --agree-tos --email admin@yourdomain.com

# Copy to nginx directory
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/key.pem
```

## Monitoring & Maintenance

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f ai-engine
docker-compose logs -f hugo-generator
```

### Backup & Restore
```bash
# Create backup
./scripts/deploy.sh backup

# Restore from backup
./scripts/deploy.sh rollback backups/20240616_143022
```

### Update Application
```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose build --no-cache
docker-compose up -d
```

## Service URLs

- **Frontend**: http://localhost (or https://yourdomain.com)
- **Backend API**: http://localhost/api
- **AI Engine**: http://localhost:3002 (internal)
- **Hugo Generator**: http://localhost:3003 (internal)
- **Database**: localhost:5432
- **Redis**: localhost:6379
- **Ollama**: localhost:11434

## Troubleshooting

### Common Issues

1. **Services won't start**
   ```bash
   # Check Docker status
   docker system df
   docker system prune -f
   
   # Rebuild from scratch
   docker-compose down -v
   docker-compose build --no-cache
   docker-compose up -d
   ```

2. **Database connection issues**
   ```bash
   # Check database logs
   docker-compose logs postgres
   
   # Reset database
   docker-compose exec backend npm run db:reset
   ```

3. **AI Engine not responding**
   ```bash
   # Check Ollama status
   docker-compose exec ollama ollama list
   
   # Pull models manually
   docker-compose exec ollama ollama pull llama3:8b
   ```

4. **Hugo generation fails**
   ```bash
   # Check Hugo version
   docker-compose exec hugo-generator hugo version
   
   # Clear temp files
   docker-compose exec hugo-generator rm -rf temp/*
   ```

### Performance Tuning

1. **Resource Limits**
   - Adjust Docker memory limits in docker-compose.yml
   - Monitor resource usage: `docker stats`

2. **Database Optimization**
   - Enable query logging for slow queries
   - Regular vacuum and analyze operations

3. **Redis Caching**
   - Monitor cache hit rates
   - Adjust cache TTL values

## Security Checklist

- [ ] Change all default passwords
- [ ] Enable SSL/TLS certificates
- [ ] Configure firewall rules
- [ ] Set up log monitoring
- [ ] Enable automatic security updates
- [ ] Regular backup testing
- [ ] Rate limiting configured
- [ ] Security headers enabled

## Scaling Considerations

For high-traffic deployments:

1. **Load Balancing**
   - Multiple backend instances
   - Redis cluster setup
   - CDN for static assets

2. **Database Scaling**
   - Read replicas
   - Connection pooling
   - Query optimization

3. **Monitoring**
   - Application performance monitoring
   - Error tracking (Sentry)
   - Metrics collection (Prometheus)

## Support & Updates

- Check GitHub releases for updates
- Monitor Docker Hub for base image updates
- Regular security patches
- Performance monitoring and optimization
