#!/bin/bash

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="website-builder"
DOCKER_COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌ $1${NC}"
    exit 1
}

# Deployment steps
deploy_production() {
    log "🚀 Starting production deployment..."
    
    # Step 1: Validate environment
    validate_environment
    
    # Step 2: Backup existing data
    backup_data
    
    # Step 3: Pull latest code
    update_code
    
    # Step 4: Build and deploy services
    deploy_services
    
    # Step 5: Run database migrations
    run_migrations
    
    # Step 6: Setup SSL certificates
    setup_ssl
    
    # Step 7: Health checks
    health_checks
    
    # Step 8: Post-deployment tasks
    post_deployment
    
    success "🎉 Production deployment completed successfully!"
}

validate_environment() {
    log "Validating deployment environment..."
    
    # Check required tools
    command -v docker >/dev/null 2>&1 || error "Docker is required but not installed"
    command -v docker-compose >/dev/null 2>&1 || error "Docker Compose is required but not installed"
    
    # Check environment file
    if [ ! -f "$ENV_FILE" ]; then
        error "Environment file $ENV_FILE not found. Copy .env.example and configure it."
    fi
    
    # Validate required environment variables
    source "$ENV_FILE"
    
    [ -z "$POSTGRES_PASSWORD" ] && error "POSTGRES_PASSWORD not set in $ENV_FILE"
    [ -z "$JWT_SECRET" ] && error "JWT_SECRET not set in $ENV_FILE"
    [ -z "$REDIS_PASSWORD" ] && error "REDIS_PASSWORD not set in $ENV_FILE"
    
    # Check disk space (minimum 10GB)
    AVAILABLE_SPACE=$(df . | awk 'NR==2 {print $4}')
    if [ "$AVAILABLE_SPACE" -lt 10485760 ]; then  # 10GB in KB
        warning "Low disk space. At least 10GB recommended for deployment."
    fi
    
    success "Environment validation passed"
}

backup_data() {
    log "Creating backup of existing data..."
    
    BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # Backup database if running
    if docker-compose ps postgres | grep -q "Up"; then
        log "Backing up PostgreSQL database..."
        docker-compose exec -T postgres pg_dump -U website_builder website_builder > "$BACKUP_DIR/database.sql"
        success "Database backup created: $BACKUP_DIR/database.sql"
    fi
    
    # Backup volumes
    if [ -d "docker_volumes" ]; then
        log "Backing up Docker volumes..."
        tar -czf "$BACKUP_DIR/volumes.tar.gz" docker_volumes/
        success "Volumes backup created: $BACKUP_DIR/volumes.tar.gz"
    fi
    
    success "Backup completed: $BACKUP_DIR"
}

update_code() {
    log "Updating code from repository..."
    
    # Pull latest changes
    git fetch origin
    git pull origin main
    
    # Update submodules (if any)
    git submodule update --init --recursive
    
    success "Code updated to latest version"
}

deploy_services() {
    log "Building and deploying services..."
    
    # Stop existing services
    docker-compose down
    
    # Build images
    log "Building Docker images..."
    docker-compose build --no-cache
    
    # Start services
    log "Starting services..."
    docker-compose up -d
    
    # Wait for services to be ready
    log "Waiting for services to start..."
    sleep 30
    
    success "Services deployed successfully"
}

run_migrations() {
    log "Running database migrations..."
    
    # Wait for database to be ready
    log "Waiting for database to be ready..."
    docker-compose exec backend npx prisma migrate deploy
    
    # Seed database if needed
    if [ "$SEED_DATABASE" = "true" ]; then
        log "Seeding database..."
        docker-compose exec backend npm run db:seed
    fi
    
    success "Database migrations completed"
}

setup_ssl() {
    log "Setting up SSL certificates..."
    
    if [ "$SSL_ENABLED" = "true" ] && [ -n "$DOMAIN" ]; then
        log "Generating SSL certificate for $DOMAIN..."
        
        # Create SSL directory
        mkdir -p nginx/ssl
        
        # Generate self-signed certificate for development
        if [ "$NODE_ENV" != "production" ]; then
            openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
                -keyout nginx/ssl/key.pem \
                -out nginx/ssl/cert.pem \
                -subj "/C=US/ST=State/L=City/O=Organization/CN=$DOMAIN"
            success "Self-signed SSL certificate generated"
        else
            # Use Certbot for production
            docker-compose exec nginx certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "$SSL_EMAIL"
            success "Let's Encrypt SSL certificate generated"
        fi
    else
        warning "SSL not configured. Set SSL_ENABLED=true and DOMAIN in .env for SSL setup"
    fi
}

health_checks() {
    log "Running health checks..."
    
    # Define services and their health check URLs
    declare -A SERVICES=(
        ["Frontend"]="http://localhost/"
        ["Backend"]="http://localhost/api/health"
        ["AI Engine"]="http://localhost:3002/health"
        ["Hugo Generator"]="http://localhost:3003/health"
    )
    
    # Wait a bit for services to fully start
    sleep 15
    
    # Check each service
    FAILED_SERVICES=""
    for SERVICE in "${!SERVICES[@]}"; do
        URL="${SERVICES[$SERVICE]}"
        log "Checking $SERVICE at $URL..."
        
        if curl -f -s "$URL" > /dev/null; then
            success "$SERVICE is healthy"
        else
            error_msg="$SERVICE health check failed"
            error "$error_msg"
            FAILED_SERVICES="$FAILED_SERVICES\n- $SERVICE"
        fi
    done
    
    if [ -n "$FAILED_SERVICES" ]; then
        error "Health checks failed for:$FAILED_SERVICES"
    fi
    
    success "All health checks passed"
}

post_deployment() {
    log "Running post-deployment tasks..."
    
    # Download Ollama models
    log "Downloading AI models..."
    docker-compose exec ollama ollama pull llama3:8b
    docker-compose exec ollama ollama pull mistral:7b
    
    # Initialize model manager
    log "Initializing AI model manager..."
    docker-compose exec ai-engine python -c "
import asyncio
from src.services.model_manager import ModelManager
from src.services.ollama_client import OllamaClient

async def init_models():
    client = OllamaClient()
    manager = ModelManager(client)
    await manager.initialize_models()

asyncio.run(init_models())
"
    
    # Cleanup old Docker images
    log "Cleaning up old Docker images..."
    docker image prune -f
    
    # Set up log rotation
    setup_log_rotation
    
    success "Post-deployment tasks completed"
}

setup_log_rotation() {
    log "Setting up log rotation..."
    
    # Create logrotate configuration
    sudo tee /etc/logrotate.d/website-builder > /dev/null <<EOF
/var/log/website-builder/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        docker-compose restart nginx
    endscript
}
EOF
    
    success "Log rotation configured"
}

# Utility functions
rollback() {
    BACKUP_DIR=$1
    if [ -z "$BACKUP_DIR" ]; then
        error "Backup directory not specified for rollback"
    fi
    
    warning "Rolling back to backup: $BACKUP_DIR"
    
    # Stop current services
    docker-compose down
    
    # Restore database
    if [ -f "$BACKUP_DIR/database.sql" ]; then
        log "Restoring database..."
        docker-compose up -d postgres
        sleep 10
        docker-compose exec -T postgres psql -U website_builder -d website_builder < "$BACKUP_DIR/database.sql"
    fi
    
    # Restore volumes
    if [ -f "$BACKUP_DIR/volumes.tar.gz" ]; then
        log "Restoring volumes..."
        tar -xzf "$BACKUP_DIR/volumes.tar.gz"
    fi
    
    # Start services
    docker-compose up -d
    
    success "Rollback completed"
}

# Main execution
case "${1:-deploy}" in
    "deploy")
        deploy_production
        ;;
    "rollback")
        rollback "$2"
        ;;
    "health")
        health_checks
        ;;
    "backup")
        backup_data
        ;;
    *)
        echo "Usage: $0 {deploy|rollback|health|backup}"
        echo "  deploy           - Full production deployment"
        echo "  rollback <dir>   - Rollback to specific backup"
        echo "  health          - Run health checks"
        echo "  backup          - Create backup only"
        exit 1
        ;;
esac
