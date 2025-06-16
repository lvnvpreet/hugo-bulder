# Hugo Generator Dockerfile
# Multi-stage build for Node.js application with Hugo CLI

# Build stage
FROM node:18-alpine as builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# Copy source code
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Development stage
FROM node:18-alpine as development

# Set environment variables - Updated Hugo version
ENV NODE_ENV=development \
    HUGO_VERSION=0.147.8 \
    PATH="/usr/local/bin:$PATH"

# Install system dependencies including file command
RUN apk add --no-cache \
    curl \
    wget \
    git \
    ca-certificates \
    tzdata \
    libc6-compat \
    libstdc++ \
    file \
    && echo "Downloading Hugo v${HUGO_VERSION}..." \
    && wget -O hugo.tar.gz "https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_extended_${HUGO_VERSION}_linux-amd64.tar.gz" \
    && echo "Extracting Hugo..." \
    && tar -xzf hugo.tar.gz \
    && echo "Checking hugo binary..." \
    && ls -la hugo \
    && file hugo \
    && echo "Moving hugo binary to /usr/local/bin..." \
    && mv hugo /usr/local/bin/hugo \
    && rm hugo.tar.gz \
    && chmod +x /usr/local/bin/hugo \
    && echo "Testing hugo binary directly..." \
    && /usr/local/bin/hugo version \
    && echo "Testing hugo via PATH..." \
    && hugo version \
    && echo "Hugo installation completed successfully"

# Create app user and directories
RUN addgroup -g 1001 -S appuser && \
    adduser -S appuser -u 1001 -G appuser

# Create application directories
RUN mkdir -p /app/output /app/packages /app/temp /app/logs /app/temp/themes && \
    chown -R appuser:appuser /app

# Set working directory
WORKDIR /app

# Copy package files
COPY --chown=appuser:appuser package*.json ./
COPY --chown=appuser:appuser tsconfig.json ./

# Install all dependencies (including dev dependencies for development)
RUN npm ci && npm cache clean --force

# Copy source code
COPY --chown=appuser:appuser src/ ./src/

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3003/health || exit 1

# Development command with hot reload
CMD ["npm", "run", "dev"]

# Production stage (RECOMMENDED - uses official Hugo image)
FROM node:18-alpine as production

# Set environment variables
ENV NODE_ENV=production \
    PATH="/usr/local/bin:$PATH" \
    PORT=3003

# Copy Hugo from official Hugo image - MUCH MORE RELIABLE
COPY --from=klakegg/hugo:0.147.8-ext-alpine /usr/lib/hugo/hugo /usr/local/bin/hugo

# Install runtime dependencies
RUN apk add --no-cache \
    curl \
    git \
    ca-certificates \
    tzdata \
    && chmod +x /usr/local/bin/hugo \
    && hugo version \
    && echo "Hugo installed successfully from official image"

# Create app user
RUN addgroup -g 1001 -S appuser && \
    adduser -S appuser -u 1001 -G appuser

# Create application directories
RUN mkdir -p /app/output /app/packages /app/temp /app/logs /app/temp/themes && \
    chown -R appuser:appuser /app

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=appuser:appuser /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appuser /app/dist ./dist
COPY --from=builder --chown=appuser:appuser /app/package*.json ./

# Copy templates directory if it exists
RUN mkdir -p ./src/templates/
COPY --chown=appuser:appuser src/templates/ ./src/templates/

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3003/health || exit 1

# Production command
CMD ["npm", "start"]