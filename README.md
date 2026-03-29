# Strategy Nexus

<div align="center">
<img width="1200" height="475" alt="Strategy Nexus Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

**AI-Powered Development Strategy Panel** - Simulate expert discussions to make better technical decisions

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19+-61DAFB.svg)](https://reactjs.org/)

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

### 🎙️ Audio Experience
- **Multi-Voice TTS**: Each agent has a distinct voice using Gemini, Cartesia, or Qwen TTS
- **Voice Selection**: Choose from multiple voice options for each agent
- **Real-time Audio**: Stream text-to-speech as agents speak during discussions

### 🔄 Flexible AI Backend
- **Cloud Models**: Use Google Gemini AI for production deployments
- **Local Models**: Integrate with Ollama for privacy and control
- **Hybrid Support**: Mix cloud and local models as needed

### 🎨 Modern Interface
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Dark/Light Themes**: Toggle between visual preferences
- **Real-time Streaming**: Watch responses generate in real-time
- **Collapsible Panels**: Focus on what matters most

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Google Gemini API key (for cloud mode)

### Installation

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd super-duper-waddle
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and add your API key:
   ```env
   GEMINI_API_KEY="your_gemini_api_key_here"
   ```

3. **Run the application**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes (cloud mode) | Google Gemini API key |
| `APP_URL` | No | Application URL (auto-injected in AI Studio) |

### Voice Provider Setup

#### Gemini TTS (Built-in)
- Uses Gemini's native TTS capabilities
- Voices: Puck, Charon, Kore, Fenrir, Zephyr, Aoede
- No additional setup required

#### Cartesia TTS (Optional)
```env
CARTESIA_API_KEY="your_cartesia_api_key"
```
- Premium voice synthesis
- Access to Cartesia's voice library

#### Qwen TTS (Local)
- Requires local Qwen TTS server
- Default URL: `http://localhost:7861`
- Voices: Chelsie, Aaron, Brenda

### Ollama Integration (Local Models)

1. **Install Ollama**
   ```bash
   curl -fsSL https://ollama.ai/install.sh | sh
   ```

2. **Pull models**
   ```bash
   ollama pull llama3
   ollama pull qwen2.5:7b
   ```

3. **Configure in app**
   - Enable "Local Mode" in settings
   - Select your preferred Ollama model
   - Adjust Ollama URL if needed (default: `http://localhost:11434`)

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
