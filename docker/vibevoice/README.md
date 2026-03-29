# 🎙️ VibeVoice TTS Docker Deployment

## Overview

High-quality text-to-speech deployment using Microsoft's VibeVoice model with Docker containerization for production use.

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+
- Python 3.8+
- At least 4GB RAM (8GB recommended)
- CUDA support (optional, for GPU acceleration)

### Deployment

```bash
# Clone repository
git clone <repository-url>
cd super-duper-waddle

# Deploy VibeVoice
chmod +x docker/vibevoice/deploy.sh
docker/vibevoice/deploy.sh production
```

## 📁 File Structure

```
docker/vibevoice/
├── Dockerfile              # Multi-stage Docker build
├── docker-compose.yml      # Production services
├── nginx.conf             # Nginx load balancer
├── deploy.sh              # Deployment script
└── README.md              # This file
```

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VIBEVOICE_MODEL` | `microsoft/vibe` | Model to use |
| `VIBEVOICE_DEVICE` | `cpu` | Device (cpu/cuda) |
| `PORT` | `8000` | Server port |
| `CUDA_VISIBLE_DEVICES` | `""` | CUDA devices |

### Docker Compose Services

#### 1. VibeVoice TTS Server
- **Port**: 8000
- **Resources**: 2GB RAM minimum
- **Health Check**: Every 30s

#### 2. Redis Cache (Optional)
- **Port**: 6379
- **Purpose**: Response caching

#### 3. Nginx Load Balancer (Optional)
- **Ports**: 80, 443
- **Purpose**: Load balancing & SSL termination

## 🔧 API Endpoints

### Health Check
```bash
GET /health
```

### Text-to-Speech
```bash
POST /api/tts
Content-Type: application/json

{
  "text": "Hello, world!",
  "config": {
    "voice": "female-natural",
    "speed": 1.0,
    "pitch": 1.0,
    "emotion": "happy"
  }
}
```

### Available Voices
```bash
GET /api/voices
```

## 🎛️ Voice Options

| Voice ID | Name | Language | Gender |
|----------|------|----------|--------|
| `default` | Default Voice | English | Neutral |
| `female-natural` | Natural Female | English | Female |
| `male-natural` | Natural Male | English | Male |
| `female-energetic` | Energetic Female | English | Female |
| `male-calm` | Calm Male | English | Male |
| `child-friendly` | Child Friendly | English | Neutral |
| `professional` | Professional | English | Neutral |
| `storyteller` | Storyteller | English | Neutral |

## 📊 Performance

### Benchmarks

| Metric | Value |
|--------|-------|
| Latency | 500-2000ms |
| Throughput | 10 requests/second |
| Memory Usage | 2-4GB |
| Model Size | ~1GB |

### Optimization Tips

1. **Use GPU**: Set `VIBEVOICE_DEVICE=cuda` for 5x speedup
2. **Caching**: Enable Redis for repeated requests
3. **Load Balancing**: Use Nginx for multiple instances
4. **Text Length**: Limit to 500 characters for optimal performance

## 🔒 Security

### Features

- **Rate Limiting**: 10 requests/second per IP
- **CORS Protection**: Configurable origins
- **Input Validation**: Text length and content checks
- **API Keys**: Optional authentication

### SSL/TLS

```bash
# Generate SSL certificates
mkdir -p ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem -out ssl/cert.pem
```

## 📈 Monitoring

### Health Metrics

```bash
# Check service health
curl http://localhost:8000/health

# View logs
docker-compose logs -f vibevoice-tts

# Monitor resources
docker stats vibevoice-tts
```

### Prometheus Metrics (Optional)

Add to `docker-compose.yml`:

```yaml
prometheus:
  image: prom/prometheus
  ports:
    - "9090:9090"
  volumes:
    - ./prometheus.yml:/etc/prometheus.yml
```

## 🚢 CI/CD Integration

### GitHub Actions

```yaml
name: Deploy VibeVoice
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Docker
        run: |
          chmod +x docker/vibevoice/deploy.sh
          docker/vibevoice/deploy.sh production
```

## 🔧 Development

### Local Development

```bash
# Start development environment
cd docker/vibevoice
docker-compose -f docker-compose.dev.yml up

# Run tests
npm test

# Build for production
npm run build
```

### Adding New Voices

1. Update `src/lib/vibevoice-tts.ts`
2. Add voice configuration to `VIBEVOICE_VOICES`
3. Update API documentation
4. Test with new voice

## 🐛 Troubleshooting

### Common Issues

#### 1. Out of Memory
```bash
# Increase Docker memory limit
docker run --memory=4g $PROJECT_NAME
```

#### 2. CUDA Not Available
```bash
# Check CUDA installation
nvidia-smi

# Use CPU fallback
export VIBEVOICE_DEVICE=cpu
```

#### 3. Slow Response Times
```bash
# Enable Redis caching
docker-compose up redis

# Use GPU acceleration
export VIBEVOICE_DEVICE=cuda
```

### Debug Mode

```bash
# Enable debug logging
export DEBUG=vibevoice:*
docker-compose up vibevoice-tts
```

## 📚 Integration Examples

### JavaScript/TypeScript

```typescript
import { generateVibeVoiceTTS } from './lib/vibevoice-tts';

const audioUrl = await generateVibeVoiceTTS(
  "Hello world!",
  "female-natural",
  "happy"
);
```

### Python

```python
import requests

response = requests.post('http://localhost:8000/api/tts', json={
    'text': 'Hello world!',
    'config': {'voice': 'female-natural'}
})

audio_data = response.json()['audio']
```

### cURL

```bash
curl -X POST http://localhost:8000/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello world!","config":{"voice":"female-natural"}}'
```

## 📄 License

This deployment is part of the Super Duper Waddle project. See main repository for license details.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📞 Support

For issues and questions:
- Create GitHub issue
- Check documentation
- Review troubleshooting guide

---

**🎙️ VibeVoice TTS - Production-ready voice synthesis**
