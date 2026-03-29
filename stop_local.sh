#!/bin/bash

# Strategy Nexus - Stop Local Development Servers
# This script stops all services started by deploy_local.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Stopping Strategy Nexus Services${NC}"
echo -e "${BLUE}========================================${NC}"

# Stop Frontend (Vite)
echo -e "${YELLOW}Stopping Frontend...${NC}"
pkill -f "vite --port=5533" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true
echo -e "${GREEN}✅ Frontend stopped${NC}"

# Stop Qwen TTS
echo -e "${YELLOW}Stopping Qwen TTS...${NC}"
pkill -f "qwen_server" 2>/dev/null || true
echo -e "${GREEN}✅ Qwen TTS stopped${NC}"

# Stop Tada TTS
echo -e "${YELLOW}Stopping Tada TTS...${NC}"
pkill -f "tada_server" 2>/dev/null || true
echo -e "${GREEN}✅ Tada TTS stopped${NC}"

# Stop VibeVoice (Docker)
if docker ps | grep -q "vibevoice"; then
    echo -e "${YELLOW}Stopping VibeVoice TTS...${NC}"
    cd docker/vibevoice 2>/dev/null && docker-compose down 2>/dev/null || true
    cd ../..
    echo -e "${GREEN}✅ VibeVoice TTS stopped${NC}"
fi

# Stop Ollama (optional - comment out if you want to keep Ollama running)
# echo -e "${YELLOW}Stopping Ollama...${NC}"
# pkill -f "ollama serve" 2>/dev/null || true
# echo -e "${GREEN}✅ Ollama stopped${NC}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}All services stopped!${NC}"
echo -e "${GREEN}========================================${NC}"
