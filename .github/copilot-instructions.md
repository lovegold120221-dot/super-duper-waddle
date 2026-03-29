# Copilot Instructions – Strategy Nexus

## Project Overview
**Strategy Nexus** is a React/TypeScript SPA that simulates a 6-agent AI panel discussion. Users submit a technical challenge; six agents (Nexus, Atlas, Echo, Veda, Nova, Cipher) deliberate across multiple rounds and produce a structured plan. Supports both cloud (Google Gemini) and local (Ollama) AI backends, with multiple TTS providers.

## Commands

```bash
npm run dev       # Dev server at http://localhost:5533
npm run build     # Production build → dist/
npm run lint      # TypeScript type-check only (tsc --noEmit)
npm run preview   # Preview production build
npm run clean     # Remove dist/
```

There is **no test framework** — `npm run lint` is the only automated check.

To run the local Qwen TTS server:
```bash
python qwen_server_simple.py   # Lightweight (no GPU, sine-wave audio)
python qwen_server.py          # Full Qwen3-TTS-0.6B model (requires GPU/torch)
# Both serve on http://localhost:7861
```

## Architecture

### Component Structure
- **`src/App.tsx`** → renders `<Panel />` only
- **`src/components/Panel.tsx`** (~1724 lines) — monolithic: owns all UI state, discussion orchestration, TTS queue management, and Web Audio visualizer. There is no router; the settings modal and memory board are toggled within this component.
- **`src/lib/`** — pure service modules, no React

### Discussion Orchestration (Panel.tsx)
The 22-turn discussion flow is hardcoded:
1. Manager (Nexus) opens
2. 4 rounds × 5 specialists = 20 turns
3. Manager closes with verdict + TODO list

Each agent turn calls either `streamAgentTurnGemini()` or `streamAgentResponse()` (Ollama) depending on `agent.provider`. The full message history is passed to each agent call — all agents share memory via the transcript.

### AI Provider Routing (`src/lib/`)
| File | Purpose |
|------|---------|
| `gemini.ts` | Gemini streaming + full-panel fallback |
| `ollama.ts` | Ollama streaming per agent |
| `gemini-tts.ts` | Gemini TTS voice generation |
| `cartesia-tts.ts` | Cartesia premium TTS |
| `qwen-tts.ts` | HTTP client → local Python server (port 7861) |
| `cartesia-voices.ts` | Voice ID mappings |

### TTS Architecture
Text renders immediately; audio is enqueued and plays sequentially. The queue is managed via `ttsQueueRef` (a ref, not state) to avoid re-renders. Audio visualization uses the Web Audio API (`audioContextRef`).

### State & Refs Pattern
`Panel.tsx` uses `useRef` for values that must not trigger re-renders:
- `abortControllerRef` — cancel in-flight discussion
- `ttsQueueRef` — sequential audio playback queue
- `audioContextRef` — Web Audio API
- `recognitionRef` — Web Speech API

### Database (Supabase)
Two tables, no authentication (permissive RLS):
- **`conversations`** — full panel transcripts, keyed by UUID
- **`user_settings`** — per-device settings via `device_id` (`'device_' + random + timestamp`); settings are upserted (never just inserted)

Settings persist to both `localStorage` and Supabase. The device ID is the only user identifier.

### Environment Variables
```
GEMINI_API_KEY=   # Required for cloud mode; injected via Vite define
```
Supabase credentials are stored in user settings (per-device), not env vars.

## Key Conventions

### Agent Definition Shape
```typescript
interface Agent {
  name: string;
  ttsProvider: 'qwen' | 'cartesia' | 'gemini' | 'default';
  voice: string;          // Provider-specific voice ID
  modelName: string;      // Ollama model name (local mode)
  provider: 'cloud' | 'local';
}
```
Default voices (Qwen TTS): Nexus=Aaron, Atlas=Damon, Echo=Felix, Veda=Henry, Nova=Isla, Cipher=Jack.

### Agent Personalities
All 6 agent system prompts live in **`src/lib/prompts.ts`** (`MASTER_PANEL_PROMPT` + one export per agent). Changes to agent behavior go here, not in Panel.tsx.

### Short-Response Filtering
Agent responses shorter than 20 characters are filtered out and retried automatically. Keep this threshold in mind when modifying generation logic.

### Path Alias
`@` resolves to the repository root (`./`), configured in both `tsconfig.json` and `vite.config.ts`.

### Styling
TailwindCSS v4 via the Vite plugin (`@tailwindcss/vite`). Theme variables (dark/light) are CSS custom properties in `src/index.css`.

### Python TTS Servers
Both servers expose identical HTTP interfaces:
- `POST /generate` — `{ text, voice, temperature?, top_p? }` → WAV audio bytes
- `GET /health` — returns available voice list

Use `qwen_server_simple.py` for local dev (no ML dependencies); `qwen_server.py` for production-quality audio.
