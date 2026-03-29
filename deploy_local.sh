#!/bin/bash

# Strategy Nexus - Local Development Bootstrap Script
# This script sets up all required services for local development
# Usage: ./deploy_local.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_PORT=5533
QWEN_PORT=7861
TADA_PORT=7862
VIBEVOICE_PORT=8000
OLLAMA_PORT=11434

# Print functions
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check Node.js
    if ! command_exists node; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version $NODE_VERSION is too old. Please upgrade to 18+."
        exit 1
    fi
    print_success "Node.js $(node --version) found"
    
    # Check npm
    if ! command_exists npm; then
        print_error "npm is not installed."
        exit 1
    fi
    print_success "npm $(npm --version) found"
    
    # Check Docker (optional but recommended)
    if command_exists docker; then
        print_success "Docker found"
        DOCKER_AVAILABLE=true
    else
        print_warning "Docker not found. TTS providers will need manual setup."
        DOCKER_AVAILABLE=false
    fi
    
    # Check Ollama
    if command_exists ollama; then
        print_success "Ollama found"
        OLLAMA_AVAILABLE=true
    else
        print_warning "Ollama not found. Local AI models won't be available."
        OLLAMA_AVAILABLE=false
    fi
    
    # Check Python (for TTS servers)
    if command_exists python3; then
        print_success "Python 3 found"
        PYTHON_AVAILABLE=true
    else
        print_warning "Python 3 not found. TTS servers may not work."
        PYTHON_AVAILABLE=false
    fi
}

# Install dependencies
install_dependencies() {
    print_header "Installing Dependencies"
    
    if [ ! -d "node_modules" ]; then
        print_info "Installing npm packages..."
        npm install
        print_success "Dependencies installed"
    else
        print_info "Dependencies already installed"
    fi
}

# Setup environment file
setup_environment() {
    print_header "Setting Up Environment"
    
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            print_success "Created .env from .env.example"
            print_warning "Please edit .env and add your API keys"
        else
            print_info "Creating default .env file..."
            cat > .env << EOF
# AI Models
GEMINI_API_KEY=

# TTS Providers
CARTESIA_API_KEY=
QWEN_TTS_URL=http://localhost:$QWEN_PORT
TADA_TTS_URL=http://localhost:$TADA_PORT
VIBEVOICE_URL=http://localhost:$VIBEVOICE_PORT

# Database (optional)
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Ollama (optional)
OLLAMA_URL=http://localhost:$OLLAMA_PORT

# Frontend
PORT=$FRONTEND_PORT
EOF
            print_success "Created .env file"
            print_warning "Please edit .env and add your API keys"
        fi
    else
        print_info ".env file already exists"
    fi
}

# Start Ollama server
start_ollama() {
    if [ "$OLLAMA_AVAILABLE" = true ]; then
        print_header "Starting Ollama Server"
        
        # Check if Ollama is already running
        if curl -s http://localhost:$OLLAMA_PORT/api/tags > /dev/null 2>&1; then
            print_success "Ollama is already running on port $OLLAMA_PORT"
        else
            print_info "Starting Ollama..."
            ollama serve &
            OLLAMA_PID=$!
            
            # Wait for Ollama to be ready
            print_info "Waiting for Ollama to start..."
            for i in {1..30}; do
                if curl -s http://localhost:$OLLAMA_PORT/api/tags > /dev/null 2>&1; then
                    print_success "Ollama started on port $OLLAMA_PORT"
                    break
                fi
                sleep 1
            done
            
            # Pull default models
            print_info "Pulling default models (this may take a while)..."
            ollama pull qwen3.5 2>/dev/null || print_warning "Failed to pull qwen3.5"
            ollama pull llama3.2 2>/dev/null || print_warning "Failed to pull llama3.2"
        fi
    fi
}

# Start Qwen TTS server
start_qwen_tts() {
    if [ "$PYTHON_AVAILABLE" = true ] && [ -f "qwen_server_simple.py" ]; then
        print_header "Starting Qwen TTS Server"
        
        # Check if already running
        if curl -s http://localhost:$QWEN_PORT/health > /dev/null 2>&1; then
            print_success "Qwen TTS is already running on port $QWEN_PORT"
        else
            print_info "Starting Qwen TTS server..."
            
            # Install requirements if needed
            if [ ! -d "venv" ]; then
                python3 -m venv venv
                source venv/bin/activate
                pip install -q torch transformers fastapi uvicorn
            else
                source venv/bin/activate
            fi
            
            # Start server
            python3 qwen_server_simple.py &
            QWEN_PID=$!
            
            print_info "Waiting for Qwen TTS to start..."
            for i in {1..30}; do
                if curl -s http://localhost:$QWEN_PORT/health > /dev/null 2>&1; then
                    print_success "Qwen TTS started on port $QWEN_PORT"
                    break
                fi
                sleep 1
            done
        fi
    else
        print_warning "Qwen TTS server not available (missing Python or server file)"
    fi
}

# Start Tada TTS server
start_tada_tts() {
    if [ "$PYTHON_AVAILABLE" = true ] && [ -f "tada_server.py" ]; then
        print_header "Starting Tada TTS Server"
        
        # Check if already running
        if curl -s http://localhost:$TADA_PORT/health > /dev/null 2>&1; then
            print_success "Tada TTS is already running on port $TADA_PORT"
        else
            print_info "Starting Tada TTS server..."
            
            source venv/bin/activate 2>/dev/null || true
            python3 tada_server.py &
            TADA_PID=$!
            
            print_info "Waiting for Tada TTS to start..."
            for i in {1..30}; do
                if curl -s http://localhost:$TADA_PORT/health > /dev/null 2>&1; then
                    print_success "Tada TTS started on port $TADA_PORT"
                    break
                fi
                sleep 1
            done
        fi
    else
        print_warning "Tada TTS server not available"
    fi
}

# Start VibeVoice TTS (Docker)
start_vibevoice() {
    if [ "$DOCKER_AVAILABLE" = true ] && [ -d "docker/vibevoice" ]; then
        print_header "Starting VibeVoice TTS (Docker)"
        
        cd docker/vibevoice
        
        # Check if already running
        if docker ps | grep -q "vibevoice-tts"; then
            print_success "VibeVoice TTS is already running"
        else
            print_info "Building and starting VibeVoice TTS..."
            docker-compose up -d --build
            print_success "VibeVoice TTS started on port $VIBEVOICE_PORT"
        fi
        
        cd ../..
    else
        print_warning "VibeVoice TTS not available (Docker not found or directory missing)"
    fi
}

# Start all TTS providers
start_tts_providers() {
    print_header "Starting TTS Providers"
    
    start_qwen_tts
    start_tada_tts
    start_vibevoice
    
    print_info "Cloud TTS providers (Cartesia, Gemini) don't need local setup"
}

# Start frontend development server
start_frontend() {
    print_header "Starting Frontend Development Server"
    
    print_info "Starting Vite dev server on port $FRONTEND_PORT..."
    print_info "This may take a moment..."
    
    # Kill any existing process on the port
    if lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "Port $FRONTEND_PORT is in use. Stopping existing process..."
        lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
    
    print_success "Starting frontend at http://localhost:$FRONTEND_PORT"
    npm run dev -- --port=$FRONTEND_PORT --host=0.0.0.0
}

# Print summary
print_summary() {
    print_header "Deployment Summary"
    
    echo -e "${GREEN}Frontend:${NC} http://localhost:$FRONTEND_PORT"
    echo -e "${GREEN}Ollama:${NC} http://localhost:$OLLAMA_PORT (if installed)"
    echo -e "${GREEN}Qwen TTS:${NC} http://localhost:$QWEN_PORT"
    echo -e "${GREEN}Tada TTS:${NC} http://localhost:$TADA_PORT"
    echo -e "${GREEN}VibeVoice:${NC} http://localhost:$VIBEVOICE_PORT"
    
    echo ""
    print_info "To stop all services, run: ./stop_local.sh"
    print_info "Or press Ctrl+C to stop the frontend"
}

# Cleanup function
cleanup() {
    print_info "Cleaning up..."
    # Kill background processes
    if [ -n "$OLLAMA_PID" ]; then
        kill $OLLAMA_PID 2>/dev/null || true
    fi
    if [ -n "$QWEN_PID" ]; then
        kill $QWEN_PID 2>/dev/null || true
    fi
    if [ -n "$TADA_PID" ]; then
        kill $TADA_PID 2>/dev/null || true
    fi
}

# Set trap for cleanup
trap cleanup EXIT

# Main function
main() {
    print_header "Strategy Nexus - Local Development Setup"
    
    check_prerequisites
    install_dependencies
    setup_environment
    start_ollama
    start_tts_providers
    print_summary
    start_frontend
}

# Run main function
main
