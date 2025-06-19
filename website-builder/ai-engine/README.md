# AI Engine Service

A modern, FastAPI-based AI content generation engine designed for seamless integration with the Website Builder microservices architecture.

## 🚀 Features

- **Multiple AI Models**: Support for Ollama local models (Llama, Mistral, Qwen, etc.)
- **Content Generation**: Automated website content creation with multiple tones and styles
- **Workflow Management**: Advanced generation pipelines with progress tracking
- **Service Communication**: Seamless integration with Backend and Hugo Generator services
- **Health Monitoring**: Comprehensive health checks and performance metrics
- **Model Management**: Automatic model discovery, installation, and optimization
- **Structured Logging**: JSON-formatted logs with request tracing
- **Performance Monitoring**: Built-in metrics and analytics

## 🏗️ Architecture

The AI Engine follows a modular architecture aligned with the project's microservices pattern:

```
ai-engine/
├── main.py                 # FastAPI application entry point
├── src/
│   ├── api/               # API endpoints
│   │   ├── content.py     # Content generation endpoints
│   │   ├── models.py      # Model management endpoints
│   │   ├── generation.py  # Advanced workflow endpoints
│   │   └── health.py      # Health check endpoints
│   ├── services/          # Core services
│   │   ├── ollama_client.py       # Ollama LLM client
│   │   ├── model_manager.py       # Model management
│   │   └── service_communication.py # Inter-service communication
│   ├── middleware/        # Request middleware
│   ├── utils/             # Utility functions
│   └── config.py          # Configuration management
├── requirements.txt       # Python dependencies
├── Dockerfile            # Container definition
└── .env.example          # Environment configuration
```

## 🛠️ Setup

### Prerequisites

- Python 3.11+
- [Ollama](https://ollama.ai/) installed and running
- Access to other Website Builder services (Backend, Hugo Generator)

### Local Development

1. **Clone and navigate to the ai-engine directory:**
   ```bash
   cd ai-engine
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Start Ollama (if not already running):**
   ```bash
   ollama serve
   ```

6. **Pull required models:**
   ```bash
   ollama pull llama3.1:8b
   ollama pull mistral:7b
   ```

7. **Start the service:**
   ```bash
   python main.py
   ```

The service will be available at `http://localhost:3002`

### Docker Setup

1. **Build the image:**
   ```bash
   docker build -t ai-engine .
   ```

2. **Run with docker-compose:**
   ```bash
   docker-compose up ai-engine
   ```

## 🔧 Configuration

Key environment variables:

```bash
# Server Configuration
HOST=0.0.0.0
PORT=3002
ENVIRONMENT=development

# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
DEFAULT_MODEL=llama3.1:8b

# Service URLs
BACKEND_URL=http://localhost:3001
HUGO_GENERATOR_URL=http://localhost:3003

# Performance
MAX_CONCURRENT_WORKFLOWS=5
WORKFLOW_TIMEOUT=600
```

## 📡 API Endpoints

### Health & Status

- `GET /health` - Service health check
- `GET /api/health/detailed` - Detailed health diagnostics
- `GET /api/health/models` - Model availability status
- `GET /api/health/services` - External service connectivity

### Content Generation

- `POST /api/content/generate` - Generate website content
- `GET /api/content/status/{generation_id}` - Check generation status
- `GET /api/content/result/{generation_id}` - Get generation results

### Model Management

- `GET /api/models` - List available models
- `GET /api/models/{model_name}` - Get model details
- `POST /api/models/install` - Install new model
- `GET /api/models/performance` - Model performance metrics

### Advanced Generation

- `POST /api/generation/advanced` - Start advanced workflow
- `GET /api/generation/{generation_id}` - Get workflow status
- `POST /api/generation/{generation_id}/cancel` - Cancel generation

## 🎯 Usage Examples

### Basic Content Generation

```python
import httpx

async def generate_content():
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:3002/api/content/generate",
            json={
                "business_name": "Tech Solutions Inc",
                "business_type": "Technology Consulting",
                "industry": "Software Development",
                "pages": ["home", "about", "services", "contact"],
                "tone": "professional",
                "length": "medium",
                "include_seo": True
            }
        )
        
        generation = response.json()
        generation_id = generation["generation_id"]
        
        # Poll for completion
        while True:
            status_response = await client.get(
                f"http://localhost:3002/api/content/status/{generation_id}"
            )
            status = status_response.json()
            
            if status["status"] == "completed":
                break
            elif status["status"] == "failed":
                raise Exception("Generation failed")
            
            await asyncio.sleep(2)
        
        # Get results
        result_response = await client.get(
            f"http://localhost:3002/api/content/result/{generation_id}"
        )
        return result_response.json()
```

### Advanced Workflow

```python
async def advanced_generation():
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:3002/api/generation/advanced",
            json={
                "project_id": "proj_123456",
                "generation_type": "website_content",
                "business_context": {
                    "name": "Green Energy Solutions",
                    "type": "Renewable Energy",
                    "description": "Solar panel installation company"
                },
                "content_requirements": {
                    "tone": "professional",
                    "length": "detailed",
                    "seo_optimized": True
                },
                "quality_level": "premium",
                "auto_notify_backend": True,
                "request_hugo_generation": True
            }
        )
        return response.json()
```

## 🔄 Service Integration

### Backend Communication

The AI Engine automatically communicates with the Backend service:

- Notifies when generation starts/completes/fails
- Validates project access with auth tokens
- Sends generated content for storage

### Hugo Generator Integration

For complete website generation:

1. AI Engine generates content
2. Automatically triggers Hugo Generator
3. Hugo Generator creates static site
4. Both services notify Backend of completion

## 📊 Monitoring

### Health Checks

```bash
# Basic health
curl http://localhost:3002/health

# Detailed diagnostics
curl http://localhost:3002/api/health/detailed

# Model status
curl http://localhost:3002/api/health/models
```

### Performance Metrics

The service provides built-in metrics:

- Request count and response times
- Model usage statistics
- Error rates and success rates
- Resource utilization

### Logging

Structured JSON logs with:

- Request tracing with unique IDs
- Performance metrics
- Error tracking
- Service communication logs

## 🔧 Development

### Running Tests

```bash
pytest tests/ -v
```

### Code Quality

```bash
# Format code
black src/ tests/

# Sort imports
isort src/ tests/

# Lint code
flake8 src/ tests/

# Type checking
mypy src/
```

### Adding New Models

1. Install model via Ollama:
   ```bash
   ollama pull new-model:latest
   ```

2. Update preferred models in config:
   ```python
   PREFERRED_MODELS = {
       "content_generation": "new-model:latest"
   }
   ```

3. Restart service to refresh model list

### Custom Content Types

To add new content generation types:

1. Add to `GenerationType` enum in `generation.py`
2. Implement generation logic in content handlers
3. Update prompts and validation

## 🚨 Troubleshooting

### Common Issues

1. **Ollama Connection Failed**
   ```bash
   # Check Ollama is running
   curl http://localhost:11434/api/tags
   
   # Start Ollama if needed
   ollama serve
   ```

2. **Model Not Available**
   ```bash
   # Check available models
   ollama list
   
   # Pull required model
   ollama pull llama3.1:8b
   ```

3. **Service Communication Errors**
   - Verify Backend/Hugo Generator are running
   - Check service URLs in configuration
   - Review network connectivity

4. **High Memory Usage**
   - Reduce `MAX_CONCURRENT_WORKFLOWS`
   - Use smaller models for development
   - Monitor with `GET /api/health/system`

### Debug Mode

Enable detailed logging:

```bash
LOG_LEVEL=DEBUG
VERBOSE_LOGGING=true
```

## 🔒 Security

- JWT token validation for authenticated requests
- Input sanitization and validation
- Rate limiting on API endpoints
- Secure service-to-service communication
- Non-root Docker container execution

## 📈 Performance

### Optimization Tips

1. **Model Selection**: Use appropriate model sizes for your hardware
2. **Concurrent Workflows**: Tune `MAX_CONCURRENT_WORKFLOWS` for your system
3. **Caching**: Enable Redis for improved performance
4. **Resource Monitoring**: Monitor CPU/memory usage

### Scaling

- Horizontal scaling with multiple instances
- Load balancing with nginx or similar
- Redis for shared state management
- Database for persistent storage

## 🤝 Contributing

1. Follow the existing code style and patterns
2. Add tests for new functionality
3. Update documentation
4. Ensure all health checks pass

## 📄 License

This project is part of the Website Builder microservices architecture.

---

For more information, see the main project documentation or contact the development team.