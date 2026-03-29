# Strategy Nexus

<div align="center">
<img width="1200" height="475" alt="Strategy Nexus Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

**AI-Powered Development Strategy Panel** - Simulate expert discussions to make better technical decisions

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19+-61DAFB.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.4+-646CFF.svg)](https://vitejs.dev/)

## 🎯 Overview

Strategy Nexus is a sophisticated AI-powered application that simulates a virtual development strategy panel. It brings together six specialized AI agents to discuss your project from different professional perspectives, helping you make better-informed decisions through realistic, human-like panel discussions.

### The Expert Panel

- **Nexus** (Manager) - Orchestrates discussions and drives decisive outcomes
- **Atlas** (Product Strategist) - Focuses on user value and market timing  
- **Echo** (Execution Engineer) - Evaluates technical feasibility and complexity
- **Veda** (System Architect) - Ensures structural integrity and scalability
- **Nova** (UX Specialist) - Champions user experience and interaction design
- **Cipher** (Research Checker) - Validates assumptions and reality-checks plans

## ✨ Key Features

### 🤖 Multi-Agent Intelligence
- **Realistic Discussions**: Agents engage in dynamic, human-like conversations with disagreements, challenges, and convergence
- **Distinct Personalities**: Each agent has unique expertise, communication style, and concerns
- **Manager-Led Convergence**: Nexus ensures discussions stay focused and lead to actionable decisions

### 🎙️ Multi-Provider TTS System
- **5 TTS Providers Supported**:
  - **Qwen** - Local Chinese TTS (self-hosted)
  - **Cartesia** - Cloud streaming TTS with low latency
  - **Gemini** - Google AI TTS with natural voices
  - **VibeVoice** - Microsoft high-quality voice synthesis
  - **Tada** - Hume AI expressive voice cloning
- **Voice Selection**: Choose from 40+ voices across all providers
- **Real-time Audio Streaming**: Stream TTS as agents speak during discussions
- **Lightweight Models**: Auto-enforced for performance (300 char limit, optimized voices)

### 🔄 Flexible AI Backend
- **Cloud Models**: Google Gemini AI for production deployments
- **Local Models**: Ollama integration for privacy and control (Llama2, Mistral, Qwen3)
- **Production Ollama**: Docker deployment with Vercel serverless proxy
- **Hybrid Support**: Mix cloud and local models per agent

### 🗣️ Conversation Management
- **ChatGPT-Style History**: Auto-generated conversation titles based on topics
- **Persistent Storage**: LocalStorage for client-side, Supabase for cloud backup
- **Conversation Panel**: Integrated history panel (no sidebar clutter)
- **New Conversation Button**: Quick-start fresh discussions
- **Continue Past Conversations**: Resume from any point in history

### 🎨 Modern Interface
- **Photorealistic Avatars**: AI-generated character portraits for each agent
- **Real-time Streaming**: Watch responses generate with loading indicators
- **Error Logging Panel**: Debug TTS and generation issues with categorized logs
- **Visual Feedback**: Loading indicators during TTS generation per agent
- **Dark/Light Themes**: Toggle between visual preferences
- **Responsive Design**: Works seamlessly on desktop and mobile

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- (Optional) Ollama for local models
- (Optional) API keys for cloud TTS providers

### Installation

```bash
# Clone repository
git clone https://github.com/lovegold120221-dot/super-duper-waddle.git
cd super-duper-waddle

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Start development server
npm run dev
```

Open http://localhost:5533 to access the application.

## 🔧 Configuration

### Environment Variables

Create a `.env` file with your API keys:

```env
# AI Models
GEMINI_API_KEY=your-gemini-api-key

# TTS Providers
CARTESIA_API_KEY=your-cartesia-key
QWEN_TTS_URL=http://localhost:7861
TADA_TTS_URL=http://localhost:7862
VIBEVOICE_URL=http://localhost:8000

# Database (optional)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-supabase-key

# Ollama (optional)
OLLAMA_URL=http://localhost:11434
```

## 🐳 Docker Deployment

### Local Ollama + TTS
```bash
# Start all services
docker-compose up -d

# Or deploy VibeVoice TTS specifically
cd docker/vibevoice
./deploy.sh production
```

### Production Vercel + Ollama
See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed production setup with:
- Vercel serverless functions
- Ollama cloud hosting (Railway/Render)
- Multi-provider TTS configuration
- SSL/TLS and security setup

## 📖 Usage Guide

### Running a Panel Discussion

1. **Enter Your Topic**
   - Describe your project, challenge, or decision point
   - Include context about constraints, timeline, or specific concerns

2. **Configure Agents**
   - Choose which agents participate (default: all 6)
   - Select voice preferences for each agent
   - Adjust AI provider settings

3. **Start Discussion**
   - Click "Start Panel" to begin
   - Watch agents engage in real-time discussion
   - Listen to audio playback if enabled

4. **Review Results**
   - Read the complete discussion transcript
   - Review the synthesized action plan
   - Export or save the results

### Example Topics

- "Should we build a mobile app or web app for our SaaS product?"
- "We need to choose between microservices and monolith architecture"
- "How should we approach user authentication for our B2B platform?"
- "What's the best tech stack for our AI-powered analytics dashboard?"

## 🏗️ Architecture

### Frontend Stack
- **React 19** - Modern React with concurrent features
- **TypeScript 5.8** - Type safety and developer experience
- **Vite 6.2** - Fast development and optimized builds
- **TailwindCSS 4.1** - Utility-first styling
- **Lucide React** - Beautiful icon system

### AI Integration
- **Google GenAI SDK** - Gemini model integration
- **Streaming Responses** - Real-time content generation
- **AbortSignal Support** - Cancellation and timeout handling

### Audio System
- **Web Audio API** - Native browser audio playback
- **Blob Management** - Efficient audio URL handling
- **Multi-provider Architecture** - Pluggable TTS system

### Component Structure
```
src/
├── components/
│   └── Panel.tsx          # Main application UI (61KB)
├── lib/
│   ├── gemini.ts         # Google AI integration
│   ├── ollama.ts         # Local model support
│   ├── prompts.ts        # Agent personality definitions
│   ├── cartesia-tts.ts   # Cartesia TTS integration
│   ├── qwen-tts.ts       # Qwen TTS integration
│   └── cartesia-voices.ts # Voice library
├── App.tsx               # Application root
├── main.tsx              # React entry point
└── index.css             # Global styles
```

## 🎛️ Development

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # TypeScript type checking
npm run clean    # Clean build artifacts
```

### Development Features

- **Hot Module Replacement** (disabled in AI Studio)
- **TypeScript Strict Mode** - Catch errors early
- **Environment-based Configuration** - Flexible deployment
- **Component-based Architecture** - Maintainable codebase

### Adding New Agents

1. Define agent personality in `src/lib/prompts.ts`
2. Add to `AGENT_SYSTEM_PROMPTS` in `Panel.tsx`
3. Configure voice options if needed
4. Update agent selection UI

### Adding TTS Providers

1. Create new module in `src/lib/[provider]-tts.ts`
2. Implement `generate[Provider]TTS` function
3. Add provider selection to UI
4. Update voice configuration logic

## 🚀 Deployment

### AI Studio (Recommended)
1. Connect your repository to AI Studio
2. Configure secrets (GEMINI_API_KEY)
3. Deploy automatically to Cloud Run

### Manual Deployment

#### Build for Production
```bash
npm run build
```

#### Deploy to Static Hosting
Deploy the `dist/` folder to:
- Vercel
- Netlify  
- Cloudflare Pages
- Any static hosting service

#### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

## 🔒 Security

### API Key Management
- Store API keys in environment variables
- Use AI Studio secrets for cloud deployment
- Never commit API keys to version control

### Local Model Security
- Ollama runs locally, no data leaves your machine
- Configure firewall rules as needed
- Use HTTPS for remote Ollama instances

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Commit your changes: `git commit -m 'Add feature description'`
5. Push to branch: `git push origin feature-name`
6. Open a Pull Request

### Development Guidelines
- Follow existing code style and patterns
- Add TypeScript types for new functionality
- Test with both cloud and local AI providers
- Update documentation for new features

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Common Issues

**Q: Agents sound repetitive**
- Try different models or temperature settings
- Ensure your topic has sufficient context
- Consider using local models for variety

**Q: TTS not working**
- Check API key configuration
- Verify voice provider is enabled
- Ensure audio permissions in browser

**Q: Ollama connection failed**
- Confirm Ollama is running: `ollama list`
- Check URL configuration in settings
- Verify model is downloaded

### Getting Help

- **Documentation**: Check this README and inline code comments
- **Issues**: Report bugs via GitHub Issues
- **Discussions**: Use GitHub Discussions for questions
- **AI Studio**: View your app at https://ai.studio/apps/164f73bd-12b3-4e6d-a887-9301409513f7

## 🗺️ Roadmap

- [ ] Custom agent creation
- [ ] Discussion export formats (PDF, Markdown)
- [ ] Team collaboration features
- [ ] Advanced voice customization
- [ ] Integration with more AI providers
- [ ] Real-time collaboration
- [ ] Discussion templates library

---

**Built with ❤️ by Eburon AI**  
*Empowering better decisions through AI collaboration*
