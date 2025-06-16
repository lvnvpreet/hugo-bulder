#!/bin/bash

# SSL Setup Script for Website Builder
set -e

DOMAIN=${1:-localhost}
EMAIL=${2:-admin@example.com}
SSL_DIR="nginx/ssl"

log() {
    echo -e "\033[0;34m[$(date +'%Y-%m-%d %H:%M:%S')] $1\033[0m"
}

success() {
    echo -e "\033[0;32m[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $1\033[0m"
}

error() {
    echo -e "\033[0;31m[$(date +'%Y-%m-%d %H:%M:%S')] ❌ $1\033[0m"
    exit 1
}

setup_ssl() {
    log "Setting up SSL for domain: $DOMAIN"
    
    # Create SSL directory
    mkdir -p "$SSL_DIR"
    
    if [ "$DOMAIN" = "localhost" ] || [ "$NODE_ENV" != "production" ]; then
        # Development: self-signed certificate
        log "Generating self-signed certificate for development..."
        
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "$SSL_DIR/key.pem" \
            -out "$SSL_DIR/cert.pem" \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=$DOMAIN"
        
        success "Self-signed SSL certificate generated"
    else
        # Production: Let's Encrypt
        log "Setting up Let's Encrypt certificate for production..."
        
        # Install certbot if not present
        if ! command -v certbot &> /dev/null; then
            log "Installing certbot..."
            if command -v apt-get &> /dev/null; then
                sudo apt-get update
                sudo apt-get install -y certbot python3-certbot-nginx
            elif command -v yum &> /dev/null; then
                sudo yum install -y certbot python3-certbot-nginx
            else
                error "Package manager not supported. Please install certbot manually."
            fi
        fi
        
        # Generate certificate
        sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "$EMAIL"
        
        # Copy certificates to nginx directory
        sudo cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$SSL_DIR/cert.pem"
        sudo cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$SSL_DIR/key.pem"
        sudo chown $(whoami):$(whoami) "$SSL_DIR"/*.pem
        
        success "Let's Encrypt SSL certificate generated"
        
        # Set up automatic renewal
        setup_auto_renewal
    fi
}

setup_auto_renewal() {
    log "Setting up automatic SSL certificate renewal..."
    
    # Create renewal script
    cat > /tmp/renew-ssl.sh << 'EOF'
#!/bin/bash
certbot renew --quiet
if [ $? -eq 0 ]; then
    # Copy renewed certificates
    DOMAIN=$(ls /etc/letsencrypt/live/ | head -1)
    cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "SSL_DIR/cert.pem"
    cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "SSL_DIR/key.pem"
    
    # Reload nginx
    docker-compose exec nginx nginx -s reload
fi
EOF
    
    # Replace SSL_DIR placeholder
    sed -i "s|SSL_DIR|$PWD/$SSL_DIR|g" /tmp/renew-ssl.sh
    
    # Install script
    sudo mv /tmp/renew-ssl.sh /usr/local/bin/renew-ssl.sh
    sudo chmod +x /usr/local/bin/renew-ssl.sh
    
    # Add to crontab
    (crontab -l 2>/dev/null; echo "0 12 * * * /usr/local/bin/renew-ssl.sh") | crontab -
    
    success "Automatic SSL renewal configured"
}

# Main execution
setup_ssl
