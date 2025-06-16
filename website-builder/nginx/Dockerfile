FROM nginx:alpine

# Install certbot for SSL certificates
RUN apk add --no-cache certbot certbot-nginx

# Copy configuration files
COPY conf.d/ /etc/nginx/conf.d/
COPY nginx.conf /etc/nginx/nginx.conf

# Create directories for SSL and logs
RUN mkdir -p /etc/nginx/ssl /var/log/nginx /var/www/packages

# Set proper permissions
RUN chown -R nginx:nginx /var/www/packages

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
