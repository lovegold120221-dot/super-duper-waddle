# 🚀 Production Deployment Guide

Complete deployment guide for Strategy Nexus with Ollama, TTS providers, and Vercel.

## 📋 Table of Contents

- [Ollama Deployment](#ollama-deployment)
- [TTS Providers Deployment](#tts-providers-deployment)
- [Docker Deployment Considerations](#docker-deployment-considerations)
- [Security Considerations](#security-considerations)
- [Monitoring & Logging](#monitoring--logging)
- [Performance Optimization](#performance-optimization)
- [Troubleshooting](#troubleshooting)
- [Cost Optimization](#cost-optimization)

---

## Ollama Deployment

### **Option 1: Self-Hosted Ollama Server**

#### **1. Host Ollama on a Cloud Server**
```bash
# On Ubuntu/Debian server
curl -fsSL https://ollama.ai/install.sh | sh

# Start Ollama server
ollama serve --host 0.0.0.0 --port 11434

# Install models
ollama pull llama2
ollama pull codellama
ollama pull mistral
```

#### **2. Configure Environment**
```bash
# In Vercel dashboard
OLLAMA_URL=https://your-server-ip:11434
OLLAMA_API_KEY=your-secure-key

# Or use domain with SSL
OLLAMA_URL=https://ollama.yourdomain.com
```

### **Option 2: Railway (Easy Deployment)**

#### **1. Create Railway App**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create new project
railway new

# Deploy Ollama
railway up
```

#### **2. Railway Dockerfile**
```dockerfile
# Dockerfile
FROM ollama/ollama

EXPOSE 11434

CMD ["ollama", "serve", "--host", "0.0.0.0"]
```

#### **3. Configure Vercel**
```bash
OLLAMA_URL=https://your-app.railway.app
```

### **Option 3: Render (Alternative)**

#### **1. Deploy to Render**
- Create new Web Service
- Use Docker image: `ollama/ollama`
- Set port to 11434
- Add health check: `/`

#### **2. Configure Vercel**
```bash
OLLAMA_URL=https://your-app.onrender.com
```

### **Option 4: Cloudflare Workers (Advanced)**

#### **1. Create Cloudflare Worker**
```javascript
// worker.js
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    if (url.pathname === '/api/generate') {
      // Proxy to your Ollama server
      const ollamaResponse = await fetch('https://your-ollama-server.com/api/generate', {
        method: 'POST',
        headers: request.headers,
        body: request.body
      });
      
      return ollamaResponse;
    }
    
    return new Response('Not found', { status: 404 });
  }
};
```

### **Vercel Deployment Steps**

#### **1. Update Environment Variables**
```bash
# In Vercel project settings
OLLAMA_URL=https://your-ollama-server.com
GEMINI_API_KEY=your-gemini-key
CARTESIA_API_KEY=your-cartesia-key
QWEN_TTS_URL=http://localhost:7861
TADA_TTS_URL=http://localhost:7862
VIBEVOICE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-supabase-key
```

#### **2. Deploy to Vercel**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod

# Or connect GitHub repo for auto-deployment
vercel link
vercel --prod
```

#### **3. Update Code for Production**
```typescript
// In Panel.tsx
import { streamAgentResponseSmart, fetchOllamaModelsSmart, getOllamaUrlSmart } from '../lib/ollama-client';

// Replace ollama imports
// OLD: import { streamAgentResponse, fetchOllamaModels } from '../lib/ollama';
// NEW: import { streamAgentResponseSmart, fetchOllamaModelsSmart } from '../lib/ollama-client';
```

## TTS Providers Deployment

### **Qwen TTS (Local/Cloud)**

#### Docker Deployment
```dockerfile
FROM python:3.9-slim

WORKDIR /app
RUN pip install torch transformers

COPY qwen_server.py .
EXPOSE 7861

CMD ["python", "qwen_server.py"]
```

```bash
docker build -t qwen-tts .
docker run -d -p 7861:7861 --gpus all qwen-tts
```

### **Tada TTS (Hume AI)**

#### Tada Docker Deployment
```dockerfile
FROM python:3.9-slim

WORKDIR /app
RUN pip install tada-tts torch

COPY tada_server.py .
EXPOSE 7862

CMD ["python", "tada_server.py"]
```

```bash
docker build -t tada-tts .
docker run -d -p 7862:7862 tada-tts
```

### **VibeVoice TTS (Microsoft)**

See [docker/vibevoice/README.md](docker/vibevoice/README.md) for comprehensive deployment guide.

Quick start:
```bash
cd docker/vibevoice
./deploy.sh production
```

### **Cartesia TTS (Cloud)**

No deployment needed - managed cloud service. Just add API key:
```env
CARTESIA_API_KEY=sk_car_xxxxxxxx
```

### **Gemini TTS (Google Cloud)**

No deployment needed - part of Gemini API. Just add API key:
```env
GEMINI_API_KEY=xxxxxxxx
```

---

## Docker Deployment Considerations

#### **1. Config Protection**
```bash
# Use Vercel environment variables
OLLAMA_API_KEY=sk-xxxxx
```

### **Security Considerations**

#### **1. API Key Protection**
```bash
# Use Vercel environment variables
OLLAMA_API_KEY=sk-xxxxx

# Add authentication to Ollama server
ollama serve --host 0.0.0.0 --port 11434 --api-key your-key
```

#### **2. API Rate Limiting**
```typescript
// In api/ollama-proxy.ts
const rateLimit = new Map<string, number>();

export default async function handler(req, res) {
  const clientIp = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowStart = now - 60000; // 1 minute window
  
  if (!rateLimit.has(clientIp)) {
    rateLimit.set(clientIp, 0);
  }
  
  const requests = rateLimit.get(clientIp) || 0;
  if (requests > 100) { // 100 requests per minute
    return res.status(429).json({ error: 'Too many requests' });
  }
  
  rateLimit.set(clientIp, requests + 1);
}
```

#### **3. CORS Configuration**
```typescript
// In api/ollama-proxy.ts
res.setHeader('Access-Control-Allow-Origin', process.env.NODE_ENV === 'production' 
  ? 'https://your-app.vercel.app' 
  : '*');
```

### **Monitoring & Logging**

#### **1. Add Logging**
```typescript
// In api/ollama-proxy.ts
console.log(`[${new Date().toISOString()}] Ollama request:`, {
  model,
  promptLength: prompt?.length,
  userAgent: req.headers['user-agent']
});
```

#### **2. Health Checks**
```typescript
// Add health check endpoint
// api/health.ts
export default function handler(req, res) {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    ollamaUrl: process.env.OLLAMA_URL
  });
}
```

### **Performance Optimization**

#### **1. Request Caching**
```typescript
// Add caching for model lists
const cache = new Map<string, any>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function fetchModels() {
  const cacheKey = 'ollama-models';
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const models = await fetchOllamaModels();
  cache.set(cacheKey, { data: models, timestamp: Date.now() });
  
  return models;
}
```

#### **2. Streaming Optimization**
```typescript
// Optimize streaming for production
res.setHeader('Cache-Control', 'no-cache');
res.setHeader('Connection', 'keep-alive');
```

### **Troubleshooting**

#### **Common Issues:**
1. **CORS errors** - Check environment variables
2. **Timeout errors** - Increase Vercel function timeout
3. **Connection refused** - Verify Ollama server is running
4. **Model not found** - Ensure models are installed on server

#### **Common Debug Commands:**
```bash
# Test Ollama server
curl http://your-server:11434/api/tags

# Test Vercel function
curl https://your-app.vercel.app/api/health

# Check logs
vercel logs
```

### **Cost Optimization**

#### **1. Use Serverless Functions Wisely**
- Cache model lists
- Implement rate limiting
- Use streaming for large responses

#### **2. Choose Right Hosting Options**
- **Railway**: $5-20/month
- **Render**: Free tier available
- **DigitalOcean**: $5/month
- **Self-hosted**: Most cost-effective

This setup provides a robust production solution for Ollama models on Vercel! 🚀
