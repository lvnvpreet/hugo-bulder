# Multi-stage Dockerfile for Website Builder Backend
# Base image with Node.js 18 LTS on Alpine Linux for smaller size
FROM node:18-alpine AS base

# Install system dependencies needed for native modules and Sharp
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    vips-dev \
    libc6-compat

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./
COPY prisma ./prisma/

# Development stage
FROM base AS development

# Install all dependencies (including dev dependencies)
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Expose port for development
EXPOSE 3001
EXPOSE 9229

# Development command with hot reload and debugging
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS build

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Type check and build the application
RUN npm run type-check
RUN npm run build

# Production dependencies stage
FROM base AS prod-deps

# Install only production dependencies
RUN npm ci --only=production --ignore-scripts

# Generate Prisma client for production
COPY prisma ./prisma/
RUN npx prisma generate

# Production stage
FROM node:18-alpine AS production

# Install system dependencies needed for runtime
RUN apk add --no-cache \
    vips \
    postgresql-client

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S backend -u 1001

# Set working directory
WORKDIR /app

# Copy production dependencies
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/package*.json ./

# Copy built application
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

# Copy necessary runtime files
COPY --from=build /app/uploads ./uploads
COPY --from=build /app/scripts ./scripts

# Create necessary directories and set permissions
RUN mkdir -p logs temp-generation generated-sites uploads/temp uploads/images uploads/documents uploads/videos uploads/audio uploads/thumbnails uploads/webp
RUN chown -R backend:nodejs /app

# Switch to non-root user
USER backend

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Production command
CMD ["npm", "start"]