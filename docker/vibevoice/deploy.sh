#!/bin/bash

# VibeVoice Docker Deployment Script
# Usage: ./deploy.sh [environment]

set -e

ENVIRONMENT=${1:-development}
PROJECT_NAME="vibevoice-tts"
DOCKER_REGISTRY="your-registry.com"

echo "🚀 Deploying VibeVoice TTS to $ENVIRONMENT"

# Build and tag Docker image
echo "📦 Building Docker image..."
docker build -t $PROJECT_NAME:latest \
  -t $PROJECT_NAME:$ENVIRONMENT-$(date +%Y%m%d-%H%M%S) \
  -f docker/vibevoice/Dockerfile .

# Tag for registry (if configured)
if [ "$DOCKER_REGISTRY" != "your-registry.com" ]; then
    echo "🏷️ Tagging for registry..."
    docker tag $PROJECT_NAME:latest $DOCKER_REGISTRY/$PROJECT_NAME:latest
    docker tag $PROJECT_NAME:latest $DOCKER_REGISTRY/$PROJECT_NAME:$ENVIRONMENT
fi

# Push to registry (if configured)
if [ "$DOCKER_REGISTRY" != "your-registry.com" ]; then
    echo "📤 Pushing to registry..."
    docker push $DOCKER_REGISTRY/$PROJECT_NAME:latest
    docker push $DOCKER_REGISTRY/$PROJECT_NAME:$ENVIRONMENT
fi

# Deploy with Docker Compose
echo "🐳 Deploying with Docker Compose..."
cd docker/vibevoice

# Create necessary directories
mkdir -p models cache ssl

# Set environment variables
export ENVIRONMENT=$ENVIRONMENT
export COMPOSE_PROJECT_NAME=$PROJECT_NAME

# Stop existing services
docker-compose down --remove-orphans || true

# Pull latest images
docker-compose pull

# Start services
if [ "$ENVIRONMENT" = "production" ]; then
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
else
    docker-compose up -d
fi

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Health check
echo "🏥 Checking service health..."
for i in {1..10}; do
    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        echo "✅ VibeVoice TTS is healthy!"
        break
    else
        echo "⏳ Waiting for service... ($i/10)"
        sleep 10
    fi
    
    if [ $i -eq 10 ]; then
        echo "❌ Service failed to start properly"
        docker-compose logs vibevoice-tts
        exit 1
    fi
done

# Show status
echo "📊 Service status:"
docker-compose ps

# Show logs
echo "📋 Recent logs:"
docker-compose logs --tail=20 vibevoice-tts

echo "🎉 VibeVoice TTS deployment completed!"
echo "🌐 API available at: http://localhost:8000"
echo "🔧 Health check: http://localhost:8000/health"
echo "📚 Documentation: http://localhost:8000/docs"

# Cleanup
echo "🧹 Cleaning up old images..."
docker image prune -f

echo "✨ Deployment finished successfully!"
