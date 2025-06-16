# AI Engine Dockerfile
# Multi-stage build for Python FastAPI application with AI/ML dependencies

# Build stage
FROM python:3.11-slim as builder

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies for building Python packages
RUN apt-get update && apt-get install -y \
    build-essential \
    gcc \
    g++ \
    libffi-dev \
    libssl-dev \
    python3-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt

# Development stage
FROM python:3.11-slim as development

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PATH="/opt/venv/bin:$PATH"

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv

# Create app user and directory
RUN groupadd -r appuser && useradd -r -g appuser appuser
RUN mkdir -p /app/logs /app/models && \
    chown -R appuser:appuser /app

# Set working directory
WORKDIR /app

# Copy application code
COPY --chown=appuser:appuser . .

# Create .env from example if it doesn't exist
RUN if [ ! -f .env ]; then cp .env.example .env; fi

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3002/api/v1/health || exit 1

# Default command for development
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3002", "--reload"]

# Production stage
FROM python:3.11-slim as production

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PATH="/opt/venv/bin:$PATH" \
    PORT=3002 \
    HOST=0.0.0.0 \
    ENVIRONMENT=production

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv

# Create app user and directory
RUN groupadd -r appuser && useradd -r -g appuser appuser
RUN mkdir -p /app/logs /app/models && \
    chown -R appuser:appuser /app

# Set working directory
WORKDIR /app

# Copy application code with proper ownership
COPY --chown=appuser:appuser main.py .
COPY --chown=appuser:appuser src/ ./src/
COPY --chown=appuser:appuser requirements.txt .
COPY --chown=appuser:appuser .env.example .
COPY --chown=appuser:appuser package.json .

# Create .env from example if it doesn't exist
RUN if [ ! -f .env ]; then cp .env.example .env; fi

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3002/api/v1/health || exit 1

# Production command with optimized settings
CMD ["python", "-m", "uvicorn", "main:app", \
     "--host", "0.0.0.0", \
     "--port", "3002", \
     "--workers", "1", \
     "--access-log", \
     "--log-level", "info"]

# Alternative production command using gunicorn (uncomment if preferred)
# CMD ["gunicorn", "main:app", \
#      "-w", "2", \
#      "-k", "uvicorn.workers.UvicornWorker", \
#      "--bind", "0.0.0.0:3002", \
#      "--access-logfile", "-", \
#      "--error-logfile", "-", \
#      "--log-level", "info"]
