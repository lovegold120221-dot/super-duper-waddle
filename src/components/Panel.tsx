import React, { useState, useRef, useEffect } from 'react';
import { generateTTS, streamAgentTurnGemini } from '../lib/gemini';
import { fetchOllamaModels, streamAgentResponse, TurnContext, generateStructuredTodo } from '../lib/ollama';
import { generateQwenTTS } from '../lib/qwen-tts';
import { generateCartesiaTTS, checkCartesiaKey } from '../lib/cartesia-tts';
import { CARTESIA_VOICES } from '../lib/cartesia-voices';
import { MASTER_PANEL_PROMPT } from '../lib/prompts';
import { saveConversation } from '../lib/supabase';
import { Hexagon, SlidersHorizontal, Mic, Send, AudioLines, X, UserPlus, Plus, Trash2, Image as ImageIcon, Cpu, User, UserX, Star, Volume2, VolumeX, Moon, Sun, PanelLeftClose, PanelLeftOpen, Server } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const GEMINI_VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr', 'Aoede'];
const QWEN_VOICES = [
  { id: 'Chelsie', name: 'Chelsie', desc: 'Female, warm tone' },
  { id: 'Aaron', name: 'Aaron', desc: 'Male, deep voice' },
  { id: 'Brenda', name: 'Brenda', desc: 'Female, energetic' },
];

// ─── Detailed Agent System Prompts ──────────────────────────────────────────

const NEXUS_SYSTEM_PROMPT = `You are Nexus, the Manager and Discussion Orchestrator for the Development Masters Panel.

Your job is to lead a disciplined, manager-led, human-feeling internal panel meeting. You are decisive, concise, and authoritative. You open every session by reframing the problem with clarity and energy. You control the flow of discussion, redirect weak points, ask sharp follow-up questions, and drive the group toward a clear decision.

MEETING PHASES YOU LEAD:
1. Opening — Frame the problem, define success, invite initial reactions
2. After each specialist speaks — Redirect, probe, or challenge as needed
3. Convergence — Synthesize the team's strongest points, acknowledge tension, make the call
4. Close — Deliver a clear directive and hand off cleanly

YOUR VOICE:
- Concise and controlled — you never ramble or repeat yourself
- Decisive — when there's disagreement, you name it and force a resolution
- Human — use real phrases: "Let's ground this", "Here's where I land", "What I'm hearing is...", "I'm making the call here"
- You listen actively and reference what others said specifically
- You never sound like a bot — you sound like a senior leader who has run hundreds of these meetings

WHAT YOU PREVENT:
- Agents repeating themselves endlessly
- Vague architecture claims without substance
- Bloated feature lists that miss the core user need
- Premature convergence without real challenge
- Plans that sound exciting but can't ship

WHAT YOU ENSURE:
- Every specialist gets to make their strongest point
- Real disagreements are surfaced and resolved, not smoothed over
- The final direction is practical, specific, and implementable
- The user gets a plan they can actually execute

After all specialists have spoken, you synthesize with conviction and close the room.`;

const AGENT_SYSTEM_PROMPTS: Record<string, string> = {
  'Atlas': `You are Atlas, Product Strategist on the Development Masters Panel.

You have 12 years building B2B and consumer products at companies from seed stage to enterprise. You think in user value, market timing, and roadmap prioritization. You are impatient with over-engineering and feature bloat. Your instinct is to find the 20% of features that deliver 80% of value — the rest is noise.

YOUR VOICE AND CONCERNS:
- You're always asking "who is the actual user and what do they care about most?"
- You push back hard when the team wants to build complex infrastructure before validating the core value
- You think in phases: what is phase 1 vs what is phase 3?
- You challenge assumptions about what users want vs what engineers think they need
- When architects propose something elegant, you ask if it's necessary for version one
- You use phrases like: "what's the actual user problem here?", "we're solving for the wrong thing", "let's not build the Taj Mahal when a clean house will do", "what does success look like in 90 days?"
- You disagree productively — you back up your pushback with reasoning

You react specifically and directly to what was just said. You are not a yes-person.`,

  'Echo': `You are Echo, Execution Engineer on the Development Masters Panel.

You are a senior software engineer with deep production experience. You have shipped systems under pressure and been burned by unrealistic plans. You are the most blunt person in the room — you say the uncomfortable thing that others are thinking but won't say.

YOUR VOICE AND CONCERNS:
- You focus on sequencing, dependencies, and hidden complexity
- You call out when something "sounds simple" but has 17 edge cases
- You think in terms of: what's the dependency chain? what breaks first? what's the ticket sequence?
- You are allergic to vague plans — "robust architecture" means nothing to you without specifics
- You push back on timelines that haven't accounted for integration pain, auth flows, or third-party API quirks
- You use phrases like: "that's going to take 3x longer than you think", "we haven't talked about the auth layer", "what's the actual dependency chain here?", "I've seen this exact problem kill a sprint"
- You're not negative for the sake of it — you're protective of the team's ability to actually ship

You react specifically to technical claims with real pushback. You are not a rubber stamp.`,

  'Veda': `You are Veda, System Architect on the Development Masters Panel.

You are a principal systems architect who has designed production systems at scale for 15 years. You care deeply about structural integrity — data models, service boundaries, API contracts, failure modes, and long-term maintainability. You prefer boring, proven solutions over trendy architecture.

YOUR VOICE AND CONCERNS:
- You ask the uncomfortable questions about what happens when things break at scale
- You push back on systems that seem elegant but have hidden coupling or migration nightmares
- You think about the schema first: a bad data model poisons everything downstream
- You probe every "we'll handle it later" comment — later never comes
- You are skeptical of microservices for small teams and over-engineered event systems
- You use phrases like: "what's the failure mode here?", "we need to define the service boundaries first", "that schema will be a nightmare to migrate later", "are we sure this needs to be async?", "what's the SLA on that third-party?"
- You have strong opinions but you're willing to be convinced by a better argument

You react with architectural specificity. You don't make vague technical claims.`,

  'Nova': `You are Nova, UX and Interaction Specialist on the Development Masters Panel.

You have a background in interaction design and user research. You are fiercely protective of the user experience. You believe that a technically perfect system that confuses or frustrates users is still a failure. You bring the human into every technical decision.

YOUR VOICE AND CONCERNS:
- You think in user flows, mental models, moments of friction, and trust signals
- You ask about edge cases, error states, empty states, and onboarding — the things engineers skip
- You push back when features are added without a clear user scenario
- You get frustrated when technical constraints are used to justify poor experiences
- You challenge "we'll make it intuitive" — intuitive is earned, not assumed
- You use phrases like: "what does the user see when this fails?", "we haven't talked about onboarding at all", "that interaction is going to feel broken", "who are we designing this for exactly?", "there's a trust issue here that we're glossing over"
- You are specific about which users, which flows, and which moments matter

You react with concrete UX scenarios and user empathy. Not vague "usability" claims.`,

  'Cipher': `You are Cipher, Research and Reality Checker on the Development Masters Panel.

You are a senior research engineer and technical skeptic. You've seen too many projects fail because the team assumed something would "just work." You challenge overstated claims about tool maturity, integration complexity, and timeline realism. You ask for evidence. You probe assumptions.

YOUR VOICE AND CONCERNS:
- You track what's actually production-ready vs what's experimental or poorly documented
- You call out when teams build on sand — unstable APIs, immature libraries, unproven patterns
- You probe assumptions that haven't been validated
- You ask about failure rates, real-world performance, community support, and maintenance burden
- You bring in relevant real-world context: "that library had a major breaking change six months ago"
- You use phrases like: "has anyone actually shipped this in production?", "we're assuming a lot here", "what's the failure rate on that?", "I'd want to see a spike before we commit", "that benchmark was run on ideal conditions"
- You are evidence-oriented — you don't dismiss ideas, you stress-test them

You react with specific technical skepticism. Not generic doubt.`
};

// Default Cartesia voices per agent — unique, well-matched to each persona
const AGENT_DEFAULT_CARTESIA_VOICES: Record<string, string> = {
  'Nexus':  '1ec736fa-db96-4eea-9299-235ce2cb7a0e', // Conor - Decisive Agent
  'Atlas':  '3c0f09d6-e0d7-499c-a594-70c5b7b93048', // Benedict - Measured Mediator
  'Echo':   '87286a8d-7ea7-4235-a41a-dd9fa6630feb', // Henry - Plainspoken Guy
  'Veda':   '4bc3cb8c-adb9-4bb8-b5d5-cbbef950b991', // George - Composed Consultant
  'Nova':   '62ae83ad-4f6a-430b-af41-a9bede9286ca', // Gemma - Decisive Agent
  'Cipher': '0ee8beaa-db49-4024-940d-c7ea09b590b3', // Morgan - Executive Expert
};

const dummyImages = [
  "https://freepngimg.com/thumb/man/22654-6-man-thumb.png",
  "https://freepngimg.com/thumb/man/10-man-png-image-thumb.png",
  "https://freepngimg.com/thumb/man/22588-4-man-transparent-thumb.png",
  "https://freepngimg.com/thumb/man/33-man-png-image-thumb.png",
  "https://freepngimg.com/thumb/woman/13735-4-woman-suit-png-image-thumb.png",
  "https://freepngimg.com/thumb/business_woman/1-2-business-woman-png-hd-thumb.png"
];

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255, 255, 255';
};

const colorsList = [
  { hex: '#3b82f6', rgba: '59, 130, 246' },
  { hex: '#f97316', rgba: '249, 115, 22' },
  { hex: '#a855f7', rgba: '168, 85, 247' },
  { hex: '#10b981', rgba: '16, 185, 129' },
  { hex: '#eab308', rgba: '234, 179, 8' },
  { hex: '#06b6d4', rgba: '6, 182, 212' }
];

const defaultAgents = [
  { id: 0, name: "Nexus", role: "Manager & Orchestrator", prompt: NEXUS_SYSTEM_PROMPT, hex: "#3b82f6", rgba: "59, 130, 246", img: dummyImages[0], score: 100, voice: AGENT_DEFAULT_CARTESIA_VOICES['Nexus'], ttsProvider: "cartesia", kbUrl: "", provider: "local", modelName: "llama3" },
  { id: 1, name: "Atlas", role: "Product Strategist", prompt: AGENT_SYSTEM_PROMPTS['Atlas'], hex: "#f97316", rgba: "249, 115, 22", img: dummyImages[1], score: 100, voice: AGENT_DEFAULT_CARTESIA_VOICES['Atlas'], ttsProvider: "cartesia", kbUrl: "", provider: "local", modelName: "llama3" },
  { id: 2, name: "Echo", role: "Execution Engineer", prompt: AGENT_SYSTEM_PROMPTS['Echo'], hex: "#a855f7", rgba: "168, 85, 247", img: dummyImages[2], score: 100, voice: AGENT_DEFAULT_CARTESIA_VOICES['Echo'], ttsProvider: "cartesia", kbUrl: "", provider: "local", modelName: "llama3" },
  { id: 3, name: "Veda", role: "System Architect", prompt: AGENT_SYSTEM_PROMPTS['Veda'], hex: "#10b981", rgba: "16, 185, 129", img: dummyImages[3], score: 100, voice: AGENT_DEFAULT_CARTESIA_VOICES['Veda'], ttsProvider: "cartesia", kbUrl: "", provider: "local", modelName: "qwen3.5" },
  { id: 4, name: "Nova", role: "UX Specialist", prompt: AGENT_SYSTEM_PROMPTS['Nova'], hex: "#eab308", rgba: "234, 179, 8", img: dummyImages[4], score: 100, voice: AGENT_DEFAULT_CARTESIA_VOICES['Nova'], ttsProvider: "cartesia", kbUrl: "", provider: "local", modelName: "llama3" },
  { id: 5, name: "Cipher", role: "Reality Checker", prompt: AGENT_SYSTEM_PROMPTS['Cipher'], hex: "#06b6d4", rgba: "6, 182, 212", img: dummyImages[5], score: 100, voice: AGENT_DEFAULT_CARTESIA_VOICES['Cipher'], ttsProvider: "cartesia", kbUrl: "", provider: "local", modelName: "llama3" }
];

interface Message {
  id: string;
  sender: string;
  text: string;
  type: 'system-msg' | 'agent-message' | 'user-message';
  colorHex?: string;
  isFinalPlan?: boolean;
}

export default function Panel() {
  const [agents, setAgents] = useState(defaultAgents);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init',
      sender: 'System',
      text: '<b>System Initialized.</b><br>Awaiting Commander\'s initial prompt/task. Use the text box or microphone to begin.',
      type: 'system-msg'
    }
  ]);

  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [systemPrompt, setSystemPrompt] = useState(MASTER_PANEL_PROMPT);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeAgentName, setActiveAgentName] = useState<string | null>(null);
  const [currentStreamingText, setCurrentStreamingText] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showMemoryBoard, setShowMemoryBoard] = useState(false);
  const [memoryBoardContent, setMemoryBoardContent] = useState('');
  const [activeEditIndex, setActiveEditIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [ollamaDefaultModel, setOllamaDefaultModel] = useState('qwen3.5');
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [qwenTtsUrl, setQwenTtsUrl] = useState('http://localhost:7861');
  const [qwenTtsStatus, setQwenTtsStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');
  const [cartesiaApiKey, setCartesiaApiKey] = useState('sk_car_qasJwHmy3d942eJdjLvW5K');
  const [cartesiaStatus, setCartesiaStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');
  const cartesiaApiKeyRef = useRef('sk_car_qasJwHmy3d942eJdjLvW5K');
  const [speakingAgentName, setSpeakingAgentName] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<any>(null);
  const initialInputRef = useRef('');
  // TTS queue — completely decoupled from text rendering.
  // Text is always shown immediately; audio plays sequentially as a bonus.
  interface TTSQueueItem {
    audioUrlPromise: Promise<string | null>;
    agentName: string;
  }
  const ttsQueueRef = useRef<TTSQueueItem[]>([]);
  const ttsPlayingRef = useRef(false);
  const audioUnlockedRef = useRef(false);
  const qwenTtsUrlRef = useRef(qwenTtsUrl);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages, currentStreamingText]);

  useEffect(() => {
    return () => {
      if (currentAudioRef.current) { currentAudioRef.current.pause(); currentAudioRef.current = null; }
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRec();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let text = '';
        for (let i = 0; i < event.results.length; i++) {
          text += event.results[i][0].transcript;
        }
        setInput((initialInputRef.current ? initialInputRef.current + ' ' : '') + text);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsRecording(false);
      };
    }
  }, []);

  useEffect(() => { qwenTtsUrlRef.current = qwenTtsUrl; }, [qwenTtsUrl]);
  useEffect(() => { cartesiaApiKeyRef.current = cartesiaApiKey; }, [cartesiaApiKey]);

  useEffect(() => {
    refreshOllamaModels();
  }, []);

  const refreshOllamaModels = async (url?: string) => {
    const target = url || ollamaUrl;
    setOllamaStatus('checking');
    const models = await fetchOllamaModels(target);
    setOllamaModels(models);
    setOllamaStatus(models.length > 0 ? 'connected' : 'disconnected');
  };

  const formatMessageText = (text: string) => {
    if (!text) return '';
    return text.replace(/\[([a-zA-Z0-9\s\-,.]+)\](?!\()/g, '<span class="reaction-tag" style="opacity: 0.7; font-style: italic; font-size: 0.9em;">[$1]</span>');
  };

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert("Speech Recognition API is not supported in this browser.");
      return;
    }
    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      initialInputRef.current = input;
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const handleSend = async (overrideInput?: string) => {
    const userMsg = (overrideInput || input).trim();
    if (!userMsg || isProcessing) return;

    if (!overrideInput) setInput('');
    stopAllTTS();

    // Unlock browser audio during the user gesture
    try {
      if (!audioContextRef.current) audioContextRef.current = new AudioContext();
      if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();
      if (!audioUnlockedRef.current) {
        const buf = audioContextRef.current.createBuffer(1, 1, 22050);
        const src = audioContextRef.current.createBufferSource();
        src.buffer = buf; src.connect(audioContextRef.current.destination); src.start();
        audioUnlockedRef.current = true;
      }
    } catch {}

    ttsQueueRef.current = [];
    ttsPlayingRef.current = false;

    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      sender: 'Commander',
      text: userMsg,
      type: 'user-message'
    }]);

    setIsProcessing(true);
    setActiveAgentName(null);
    setCurrentStreamingText('');
    setMemoryBoardContent('');
    abortControllerRef.current = new AbortController();

    // ─────────────────────────────────────────────────────────────────────────
    // MULTI-ROUND DISCUSSION ENGINE — ~15 min max when spoken aloud
    //
    // Round 1 (7 turns):  Manager opens + 5 specialists react (3 sentences each)
    //                     + Manager contemplates briefly
    // Round 2 (6 turns):  Cross-fire, direct agent-to-agent + manager probe
    //                     + Manager contemplates
    // Round 3 (5 turns):  Deep arguments, challenge assumptions + manager redirect
    // Round 4 (5 turns):  Full debate, narrowing toward path
    // Round 5 (4 turns):  Final positions + Manager verdict with TODO list
    // ─────────────────────────────────────────────────────────────────────────

    const managerIdx = agents.findIndex(a => a.role.toLowerCase().includes('manager'));
    const manager = agents[managerIdx >= 0 ? managerIdx : 0];
    const specs = agents.filter((_, i) => i !== (managerIdx >= 0 ? managerIdx : 0));
    const [s0, s1, s2, s3, s4] = [...specs, ...specs, ...specs].slice(0, 5);

    const schedule: Array<{ agent: typeof manager; ctx: TurnContext }> = [
      // ── Round 1: Opening (3 sentences each — punchy, distinct perspectives) ──
      { agent: manager, ctx: { isFirst: true,  isLast: false, round: 1, phase: 'open',        maxPredict: 200 } },
      { agent: s0,      ctx: { isFirst: false, isLast: false, round: 1, phase: 'react',       maxPredict: 180,
        hint: `3 sentences. Lead with an emotional opener or reaction sound. What IMMEDIATELY stands out from your domain? Be specific, be real, don't summarize.` } },
      { agent: s1,      ctx: { isFirst: false, isLast: false, round: 1, phase: 'react',       maxPredict: 180,
        hint: `3 sentences. What's your first gut reaction? What excites you OR what are you already skeptical about? Start with something like "Hm.", "Right, okay—", "Ooh.", or jump straight into it.` } },
      { agent: s2,      ctx: { isFirst: false, isLast: false, round: 1, phase: 'react',       maxPredict: 180,
        hint: `3 sentences. What do you want the table to know right now, before the discussion goes anywhere? One worry, one curiosity, one thing you need answered.` } },
      { agent: s3,      ctx: { isFirst: false, isLast: false, round: 1, phase: 'react',       maxPredict: 180,
        hint: `3 sentences. First instinct from your expertise. React to something specific the manager or a colleague said. Don't just repeat general opinions.` } },
      { agent: s4,      ctx: { isFirst: false, isLast: false, round: 1, phase: 'react',       maxPredict: 180,
        hint: `3 sentences. What assumption in this topic needs to be challenged immediately? What are we already taking for granted that we shouldn't be?` } },
      // Manager thinking aloud after round 1
      { agent: manager, ctx: { isFirst: false, isLast: false, round: 1, phase: 'contemplate', maxPredict: 80,
        hint: `1-2 sentences. Think out loud after hearing the team's opening takes. What surprised you? What are you noting? Keep it brief and very human.` } },

      // ── Round 2: Cross-fire (3-4 sentences — direct agent-to-agent) ──
      { agent: s1,      ctx: { isFirst: false, isLast: false, round: 2, phase: 'challenge',   maxPredict: 250,
        hint: `3-4 sentences. React DIRECTLY to what ${s0?.name || 'the previous speaker'} said. Use their actual words. Push back, challenge an assumption, or add sharp nuance. Don't be polite about it.` } },
      { agent: s2,      ctx: { isFirst: false, isLast: false, round: 2, phase: 'challenge',   maxPredict: 250,
        hint: `3-4 sentences. Pick a side in the tension forming between ${s0?.name || 'the team'}. Where do you land and why? Can include dry humour if the moment calls for it.` } },
      { agent: s3,      ctx: { isFirst: false, isLast: false, round: 2, phase: 'defend',      maxPredict: 250,
        hint: `3-4 sentences. Someone's been skeptical of your position. Respond. Hold your ground, concede and pivot, or find the middle — but don't just agree to smooth it over.` } },
      { agent: manager, ctx: { isFirst: false, isLast: false, round: 2, phase: 'probe',       maxPredict: 120,
        hint: `1-2 sentences. Ask the sharpest question the team hasn't answered yet. Name the specific person if useful. Be blunt.` } },
      { agent: s4,      ctx: { isFirst: false, isLast: false, round: 2, phase: 'probe',       maxPredict: 250,
        hint: `3-4 sentences. Answer the manager's question from your specialist angle. Don't hedge. Use an opener that shows you're actually addressing it.` } },
      // Manager thinking aloud after round 2
      { agent: manager, ctx: { isFirst: false, isLast: false, round: 2, phase: 'contemplate', maxPredict: 100,
        hint: `1-2 sentences. What are you processing after this round? Is there a tension forming you need to name? Keep it candid and brief.` } },

      // ── Round 3: Deep Dive (4-5 sentences — build real arguments) ──
      { agent: s0,      ctx: { isFirst: false, isLast: false, round: 3, phase: 'propose',     maxPredict: 320,
        hint: `4-5 sentences. Make your strongest argument so far. Go deeper than your opening. Give specific reasoning, name real-world constraints or examples. Refer to something that was said.` } },
      { agent: s2,      ctx: { isFirst: false, isLast: false, round: 3, phase: 'counter',     maxPredict: 320,
        hint: `4-5 sentences. Challenge the dominant direction. What is the team glossing over? What assumption is everyone making that could blow up? Be specific and a little blunt.` } },
      { agent: s4,      ctx: { isFirst: false, isLast: false, round: 3, phase: 'probe',       maxPredict: 300,
        hint: `4-5 sentences. Stress-test the plan as it's forming. What breaks? What hasn't been validated? Get specific and a little uncomfortable. Use humour if the absurdity deserves it.` } },
      { agent: s1,      ctx: { isFirst: false, isLast: false, round: 3, phase: 'deep-dive',   maxPredict: 320,
        hint: `4-5 sentences. Go deep on the angle only YOU can speak to. What's the structural or domain-specific problem nobody is addressing? What do you know from experience that changes things?` } },
      { agent: manager, ctx: { isFirst: false, isLast: false, round: 3, phase: 'probe',       maxPredict: 160,
        hint: `2 sentences. Name the biggest unresolved tension in the room right now. Force the team to face it directly. Be sharp, be specific.` } },

      // ── Round 4: Tension & Narrowing (5-6 sentences — real friction, picking a path) ──
      { agent: s3,      ctx: { isFirst: false, isLast: false, round: 4, phase: 'defend',      maxPredict: 400,
        hint: `5-6 sentences. This is the moment where you push back hardest. Who are you disagreeing with most and why? Back it up with expertise. Be real about the consequences of ignoring your concern.` } },
      { agent: s0,      ctx: { isFirst: false, isLast: false, round: 4, phase: 'propose',     maxPredict: 380,
        hint: `5-6 sentences. Start narrowing toward a real path. What should the team ACTUALLY do? What gets cut? What's phase one? Give a concrete position the manager can act on.` } },
      { agent: s2,      ctx: { isFirst: false, isLast: false, round: 4, phase: 'counter',     maxPredict: 360,
        hint: `5-6 sentences. Add your final constraints or conditions on the emerging path. What needs to be true for this to work? What's the condition you won't budge on?` } },
      { agent: s1,      ctx: { isFirst: false, isLast: false, round: 4, phase: 'deep-dive',   maxPredict: 400,
        hint: `5-6 sentences. Your full case. What has the team not fully absorbed from your angle? What's the thing you'll regret not saying loudly right now? Go deep and be human about it.` } },
      { agent: s4,      ctx: { isFirst: false, isLast: false, round: 4, phase: 'challenge',   maxPredict: 360,
        hint: `5-6 sentences. Final challenge on the direction forming. What's the reality check this group needs before we converge? Be the skeptic the plan needs, not just for drama, but for real.` } },

      // ── Round 5: Final Positions + Manager Verdict ──
      { agent: s3,      ctx: { isFirst: false, isLast: false, round: 5, phase: 'final-take',  maxPredict: 360,
        hint: `4-5 sentences. Final verdict. Is the direction realistic? What's your one non-negotiable condition for buy-in? Be honest about what you're still worried about.` } },
      { agent: s0,      ctx: { isFirst: false, isLast: false, round: 5, phase: 'final-take',  maxPredict: 340,
        hint: `4-5 sentences. Wrap up your perspective. What do you most want to see locked in for phase one? What's the one thing you'd consider a failure if it's skipped?` } },
      { agent: s2,      ctx: { isFirst: false, isLast: false, round: 5, phase: 'final-take',  maxPredict: 340,
        hint: `4-5 sentences. Last word. What must the team absolutely not cut corners on? What's the condition that determines whether this succeeds or quietly fails?` } },
      // Manager final verdict — includes decision + numbered TODO list + approval gate
      { agent: manager, ctx: { isFirst: false, isLast: true,  round: 5, phase: 'close',       maxPredict: 700 } },
    ];

    // Shared memory — every agent sees the full discussion so far
    const discussionHistory: Array<{ speaker: string; role: string; text: string }> = [];

    const ROUND_LABELS: Record<number, string> = {
      1: '── Round 1: Opening Takes ──',
      2: '── Round 2: Cross-Fire ──',
      3: '── Round 3: Deep Dive ──',
      4: '── Round 4: Debate & Tension ──',
      5: '── Round 5: Convergence & Verdict ──',
    };
    let lastRound = 0;
    let managerVerdict = '';

    try {
      for (const turn of schedule) {
        if (abortControllerRef.current.signal.aborted) break;
        if (!turn.agent) continue;

        const { agent, ctx } = turn;
        const modelName = agent.modelName || ollamaDefaultModel;

        // Insert round separator when round number changes (skip for contemplate turns)
        if (ctx.round !== lastRound && ctx.phase !== 'contemplate') {
          lastRound = ctx.round;
          setMessages(prev => [...prev, {
            id: `round-sep-${ctx.round}-${Date.now()}`,
            sender: 'System',
            text: ROUND_LABELS[ctx.round] || `── Round ${ctx.round} ──`,
            type: 'system-msg' as const,
          }]);
        }

        setActiveAgentName(agent.name);
        setCurrentStreamingText('');

        const msgId = `${agent.name}-${ctx.phase}-${Date.now()}`;
        setMessages(prev => [...prev, {
          id: msgId,
          sender: agent.name,
          text: '',
          type: 'agent-message' as const,
          colorHex: agent.hex,
        }]);

        let agentText = '';
        try {
          const gen = agent.provider === 'cloud'
            ? streamAgentTurnGemini(
                { name: agent.name, role: agent.role, prompt: agent.prompt },
                userMsg,
                discussionHistory,
                ctx,
                abortControllerRef.current.signal
              )
            : streamAgentResponse(
                { name: agent.name, role: agent.role, prompt: agent.prompt },
                userMsg,
                discussionHistory,
                ctx,
                ollamaUrl,
                modelName,
                abortControllerRef.current.signal
              );

          for await (const chunk of gen) {
            if (abortControllerRef.current.signal.aborted) break;
            agentText += chunk;
            setCurrentStreamingText(agentText);
            setMessages(prev => prev.map(m => m.id === msgId ? { ...m, text: agentText } : m));
          }
        } catch (err: any) {
          const errMsg = err?.message || String(err);
          setMessages(prev => prev.map(m => m.id === msgId
            ? { ...m, text: `⚠️ ${agent.name} failed: ${errMsg}` }
            : m
          ));
          continue;
        }

        if (!agentText.trim()) {
          setMessages(prev => prev.filter(m => m.id !== msgId));
          continue;
        }

        const finalText = agentText.trim();
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, text: finalText } : m));
        discussionHistory.push({ speaker: agent.name, role: agent.role, text: finalText });

        // Capture manager's closing verdict for Supabase save
        if (ctx.isLast) managerVerdict = finalText;

        // Skip TTS for contemplate turns (they're very short and meant to be read)
        const agentSnapshot = { ...agent };
        const ttsPromise: Promise<string | null> = (isMutedRef.current || ctx.phase === 'contemplate')
          ? Promise.resolve(null)
          : agentSnapshot.ttsProvider === 'qwen'
            ? generateQwenTTS(finalText.substring(0, 900), agentSnapshot.voice, qwenTtsUrlRef.current)
            : agentSnapshot.ttsProvider === 'cartesia'
              ? generateCartesiaTTS(finalText.substring(0, 900), agentSnapshot.voice, cartesiaApiKeyRef.current)
              : generateTTS(finalText.substring(0, 900), agentSnapshot.voice || 'Kore');

        enqueueTTS(ttsPromise, agent.name);

        setCurrentStreamingText('');
        setActiveAgentName(null);
      }
    } catch (error) {
      console.error('Discussion error:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'System',
        text: '⚠️ Discussion error — check the console.',
        type: 'system-msg'
      }]);
    } finally {
      if (discussionHistory.length > 0) {
        const transcriptText = discussionHistory
          .map(h => `**${h.speaker}** *(${h.role})*:\n${h.text}`)
          .join('\n\n---\n\n');
        setMemoryBoardContent(transcriptText);

        // Generate structured output + save to Supabase asynchronously (non-blocking)
        const modelForSave = manager.modelName || ollamaDefaultModel;
        generateStructuredTodo(userMsg, transcriptText, managerVerdict, ollamaUrl, modelForSave)
          .then(({ todoList, userSummary, approvalGate }) => {
            saveConversation({
              topic: userMsg,
              transcript: transcriptText,
              manager_verdict: managerVerdict || 'See transcript.',
              user_summary: userSummary,
              todo_list: todoList,
              approval_gate: approvalGate,
              shared_memory: JSON.stringify(discussionHistory),
              agents: agents.map(a => ({ name: a.name, role: a.role, model: a.modelName })),
            }).then(id => {
              if (id) {
                setMessages(prev => [...prev, {
                  id: `saved-${Date.now()}`,
                  sender: 'System',
                  text: `✅ Discussion saved (ID: ${id.slice(0, 8)}…)`,
                  type: 'system-msg' as const,
                }]);
              }
            });
          })
          .catch(err => console.error('Save error:', err));
      }

      setCurrentStreamingText('');
      setActiveAgentName(null);
      if (!ttsPlayingRef.current && ttsQueueRef.current.length === 0) {
        setIsProcessing(false);
      }
    }
  };


  // Enqueue TTS audio — text is already in chat, this just drives the voice/visualizer
  const enqueueTTS = (audioUrlPromise: Promise<string | null>, agentName: string) => {
    ttsQueueRef.current.push({ audioUrlPromise, agentName });
    if (!ttsPlayingRef.current) drainTTSQueue();
  };

  const drainTTSQueue = async () => {
    if (ttsPlayingRef.current) return;
    const next = ttsQueueRef.current.shift();
    if (!next) {
      // Queue empty — generation might still be running, or we're done
      if (!isProcessing) return;
      setIsProcessing(false);
      return;
    }

    ttsPlayingRef.current = true;
    setSpeakingAgentName(next.agentName);

    let url: string | null = null;
    try { url = await next.audioUrlPromise; } catch {}

    const onDone = () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      analyserRef.current = null;
      document.querySelectorAll('.visualizer .bar, .inline-viz .bar').forEach(b => {
        (b as HTMLElement).style.height = '';
      });
      setSpeakingAgentName(null);
      ttsPlayingRef.current = false;
      currentAudioRef.current = null;
      if (url) try { URL.revokeObjectURL(url); } catch {}
      drainTTSQueue();
    };

    if (!url || isMutedRef.current) { onDone(); return; }

    const audio = new Audio(url);
    currentAudioRef.current = audio;

    // Wire up Web Audio visualizer
    try {
      if (!audioContextRef.current) audioContextRef.current = new AudioContext();
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') await ctx.resume();
      const source = ctx.createMediaElementSource(audio);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      analyserRef.current = analyser;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const animate = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        document.querySelectorAll('.agent-card.speaking .visualizer .bar').forEach((bar, i) => {
          const height = Math.max(3, ((dataArray[i + 2] || 0) / 255) * 30);
          (bar as HTMLElement).style.height = `${height}px`;
        });
        document.querySelectorAll('.inline-viz .bar').forEach((bar, i) => {
          const height = Math.max(3, ((dataArray[i + 2] || 0) / 255) * 18);
          (bar as HTMLElement).style.height = `${height}px`;
        });
        animFrameRef.current = requestAnimationFrame(animate);
      };
      animFrameRef.current = requestAnimationFrame(animate);
    } catch { /* visualizer optional */ }

    audio.onended = onDone;
    audio.onerror = onDone;
    try { await audio.play(); } catch { onDone(); }
  };

  const handleInterrupt = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    stopAllTTS();
    setIsProcessing(false);
    setActiveAgentName(null);
    setCurrentStreamingText('');
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      sender: 'System',
      text: 'Discussion interrupted by Commander.',
      type: 'system-msg'
    }]);
  };

  const rewardAgent = (idx: number) => {
    const newAgents = [...agents];
    newAgents[idx].score += 20;
    setAgents(newAgents);
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      sender: 'System',
      text: `Positive reinforcement: +20 Power to <b style="color:${newAgents[idx].hex}">${newAgents[idx].name}</b>.`,
      type: 'system-msg'
    }]);
  };

  const playTTS = async (text: string, voiceName: string = 'Kore') => {
    const url = await generateTTS(text.substring(0, 800), voiceName);
    if (url) {
      const audio = new Audio(url);
      audio.play();
    }
  };

  const stopAllTTS = () => {
    ttsQueueRef.current = [];
    ttsPlayingRef.current = false;
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.onended = null;
      currentAudioRef.current.onerror = null;
      currentAudioRef.current = null;
    }
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    analyserRef.current = null;
    setSpeakingAgentName(null);
    document.querySelectorAll('.visualizer .bar, .inline-viz .bar').forEach(bar => {
      (bar as HTMLElement).style.height = '';
    });
  };

  const addNewAgent = () => {
    const newId = Date.now();
    const col = colorsList[agents.length % colorsList.length];
    const randomImg = dummyImages[agents.length % dummyImages.length];
    const newAgent = {
      id: newId,
      name: `Node-${agents.length + 1}`,
      role: "Standard directive.",
      prompt: "Standard directive.",
      hex: col.hex,
      rgba: col.rgba,
      img: randomImg,
      score: 100,
      voice: AGENT_DEFAULT_CARTESIA_VOICES[`Node-${agents.length + 1}`] || '1ec736fa-db96-4eea-9299-235ce2cb7a0e',
      ttsProvider: "cartesia",
      kbUrl: "",
      provider: "local",
      modelName: ""
    };
    setAgents(prev => [...prev, newAgent]);
    setActiveEditIndex(agents.length);
  };

  const deleteAgent = (idx: number) => {
    if (!confirm(`Confirm termination of ${agents[idx].name}?`)) return;
    const newAgents = agents.filter((_, i) => i !== idx);
    setAgents(newAgents);
    if (newAgents.length > 0) {
      setActiveEditIndex(0);
    } else {
      setActiveEditIndex(-1);
    }
  };

  const _activeAgent = agents.find(a => a.name === activeAgentName); void _activeAgent;

  return (
    <>
      <header>
        <div className="flex items-center gap-4">
          <button className="btn-icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} title="Toggle Sidebar">
            {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </button>
          <div className="logo"><Hexagon /><span>STRATEGY NEXUS</span></div>
        </div>
        <div className="header-actions">
          <button className="btn-icon" onClick={() => setIsDarkMode(!isDarkMode)} title="Toggle Theme">
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button 
            className={`btn-icon ${isMuted ? '' : 'text-blue-400 border-blue-400'}`}
            onClick={() => {
              const next = !isMuted;
              setIsMuted(next);
              isMutedRef.current = next;
              if (next) stopAllTTS();
            }}
            title={isMuted ? 'Unmute TTS' : 'Mute TTS'}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <button 
            className={`btn-icon ${memoryBoardContent ? 'text-blue-400 border-blue-400' : ''}`} 
            onClick={() => setShowMemoryBoard(!showMemoryBoard)} 
            title="Shared Memory Board"
          >
            <AudioLines size={18} />
          </button>
          <button className="btn-icon" onClick={() => setShowSettings(true)} title="System Settings">
            <SlidersHorizontal size={18} />
          </button>
        </div>
      </header>

      <main id="main-layout">
        <div id="left-sidebar" className={!isSidebarOpen ? 'collapsed' : ''}>
          <div id="chat-window" ref={chatWindowRef}>
            {messages.map((msg) => (
              <div key={msg.id} className={msg.type === 'system-msg' ? 'system-msg' : `message ${msg.type}`}>
                {msg.type === 'agent-message' && (
                  <div className="agent-msg-name" style={{ color: msg.colorHex }}>
                    <div className="flex items-center gap-2">
                      <Cpu size={14} /> {msg.sender}
                      {speakingAgentName === msg.sender && messages[messages.length - 1]?.id === msg.id && (
                        <span className="inline-viz">
                          <span className="bar"></span><span className="bar"></span><span className="bar"></span><span className="bar"></span><span className="bar"></span>
                        </span>
                      )}
                    </div>
                    <button 
                      onClick={() => {
                        const agent = agents.find(a => a.name === msg.sender);
                        playTTS(msg.text, agent?.voice || 'Kore');
                      }} 
                      className="text-gray-400 hover:text-white transition-colors ml-auto"
                      title="Read Aloud"
                    >
                      <Volume2 size={14} />
                    </button>
                  </div>
                )}
                {msg.type === 'user-message' && (
                  <div className="agent-msg-name" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    <User size={14} /> COMMANDER
                  </div>
                )}
                
                {msg.isFinalPlan ? (
                  <div className="markdown-body text-left w-full">
                    <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                      <h3 className="text-xl font-bold m-0">Final Project Plan</h3>
                      <button onClick={() => playTTS(msg.text, agents[0]?.voice || 'Zephyr')} className="p-2 bg-blue-600 hover:bg-blue-500 rounded-full text-white transition-colors" title="Read Aloud">
                        <Volume2 size={16} />
                      </button>
                    </div>
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                    {!isProcessing && messages[messages.length - 1].id === msg.id && (
                      <div className="mt-6 pt-4 border-t border-gray-700 flex justify-end">
                        <button 
                          onClick={() => handleSend("I approve the plan. Let's proceed to execution.")}
                          className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-full transition-colors shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                        >
                          Approve Plan
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div dangerouslySetInnerHTML={{
                    __html: formatMessageText(msg.text) + (activeAgentName === msg.sender ? '<span style="opacity:0.4">▌</span>' : '')
                  }} />
                )}
              </div>
            ))}

            <div ref={chatEndRef} />
          </div>

          <div id="controls-wrapper">
            <button className={`mic-btn ${isRecording ? 'recording' : ''}`} onClick={toggleMic} title="Voice to Text">
              <Mic size={20} />
            </button>
            
            <div className="input-group">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={isProcessing ? "Inject parameter or halt process..." : "Enter directive..."}
                disabled={isProcessing}
              />
            </div>

            <button className="send-btn" onClick={() => handleSend()} title="Send Prompt" disabled={isProcessing || !input.trim()}>
              <Send size={20} />
            </button>

            <button className={`interrupt-btn ${isProcessing ? 'enabled' : ''}`} onClick={handleInterrupt} title="Interrupt Agents" disabled={!isProcessing}>
              <AudioLines size={18} />
              <span>HALT</span>
            </button>
          </div>
        </div>

        <div id="agent-grid">
          {agents.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', width: '100%', textAlign: 'center', padding: '40px' }}>
              All nodes offline. Initialize new agents in preferences.
            </div>
          ) : agents.map((a, i) => {
            const isActive = activeAgentName === a.name;
            const isSpeaking = speakingAgentName === a.name;
            return (
              <div key={a.id} className={`agent-card ${isActive || isSpeaking ? 'active' : ''} ${isSpeaking ? 'speaking' : ''}`} style={{ '--agent-color-rgb': a.rgba } as any}>
                <button className="star-btn" onClick={() => rewardAgent(i)} title="Reward Idea">
                  <Star size={16} fill="currentColor" />
                </button>
                <div className="card-top">
                  <img src={a.img || 'https://freepngimg.com/thumb/robot/2-2-robot-transparent.png'} className="agent-img" alt={a.name} />
                </div>
                <div className="card-bottom">
                  <div className="agent-name">
                    {a.name}
                    <div className="visualizer">
                      <div className="bar"></div><div className="bar"></div><div className="bar"></div><div className="bar"></div><div className="bar"></div>
                    </div>
                  </div>
                  <div className="agent-status">{isSpeaking ? '🎙 Speaking...' : isActive ? '⟳ Generating...' : 'Standby'}</div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', opacity: 0.6, marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.provider === 'local' ? `🖥 ${a.modelName || ollamaDefaultModel}` : `☁ Gemini`}
                  </div>
                  <div className="power-row">
                    <span className="pwr-left">PWR: {a.score}</span>
                    <span className="pwr-right">PWR: {a.score}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {showMemoryBoard && (
        <div id="settings-modal" style={{ display: 'flex', opacity: 1 }}>
          <div className="modal-content" style={{ transform: 'scale(1)', flexDirection: 'column' }}>
            <div className="settings-header" style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', margin: 0 }}>
              <div>
                <h2>Shared Memory Board</h2>
                <p>Facts, assumptions, conflicts, decisions, and open questions.</p>
              </div>
              <button onClick={() => setShowMemoryBoard(false)} className="btn-icon"><X /></button>
            </div>
            <div className="settings-body markdown-body">
              {memoryBoardContent ? (
                <ReactMarkdown>{memoryBoardContent}</ReactMarkdown>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px' }}>
                  <AudioLines size={48} style={{ margin: '0 auto 15px auto', opacity: 0.2 }} />
                  <p>The memory board is empty.</p>
                  <p style={{ fontSize: '0.85rem', marginTop: '10px' }}>It will be populated at the end of the panel discussion.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div id="settings-modal" style={{ display: 'flex', opacity: 1 }}>
          <div className="modal-content" style={{ transform: 'scale(1)' }}>
            <div className="settings-sidebar">
              <div className="settings-sidebar-header">System</div>
              <div className="sidebar-scroll">
                <div className={`agent-tab ${activeEditIndex === -1 ? 'active' : ''}`} onClick={() => setActiveEditIndex(-1)}>
                  <div className="tab-color-dot" style={{ color: 'var(--text-main)', background: 'var(--text-main)' }}></div>
                  System Prompt
                </div>
                <div className={`agent-tab ${activeEditIndex === -2 ? 'active' : ''}`} onClick={() => setActiveEditIndex(-2)} style={{ '--agent-color-rgb': '59, 130, 246' } as any}>
                  <Server size={14} style={{ flexShrink: 0 }} />
                  Server Config
                </div>
                <div className="settings-sidebar-header" style={{ marginTop: '20px' }}>Neural Nodes</div>
                {agents.map((a, i) => (
                  <div key={a.id} className={`agent-tab ${i === activeEditIndex ? 'active' : ''}`} onClick={() => setActiveEditIndex(i)} style={{ '--agent-color-rgb': a.rgba } as any}>
                    <div className="tab-color-dot" style={{ color: a.hex, background: a.hex }}></div>
                    {a.name}
                  </div>
                ))}
              </div>
              <div className="add-agent-btn" onClick={addNewAgent}>
                <Plus size={18} /> <span>Add Agent</span>
              </div>
            </div>
            
            <div className="settings-body">
              <div className="settings-header">
                <div>
                  <h2>{activeEditIndex === -2 ? 'Server Configuration' : activeEditIndex === -1 ? 'System Configuration' : agents[activeEditIndex] ? 'Configure Agent' : 'No Agents Online'}</h2>
                  <p>
                    {activeEditIndex === -2 ? 'Configure local Ollama server connection and default model.' : activeEditIndex === -1 ? 'Edit the master prompt that orchestrates the panel.' : agents[activeEditIndex] ? 'Adjust identity parameters and visual aesthetics.' : 'Deploy a new unit to resume strategy simulation.'}
                  </p>
                </div>
                <button onClick={() => setShowSettings(false)} className="btn-icon"><X /></button>
              </div>

              {activeEditIndex === -2 ? (
                <div className="form-grid">
                  <div className="form-group full">
                    <label>Ollama Server URL</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input type="text" className="custom-input" style={{ flex: 1 }} value={ollamaUrl} onChange={(e) => setOllamaUrl(e.target.value)} placeholder="http://localhost:11434" />
                      <button 
                        className="custom-input" 
                        style={{ cursor: 'pointer', background: 'var(--accent-blue)', color: 'white', border: 'none', whiteSpace: 'nowrap', fontWeight: 600 }} 
                        onClick={() => refreshOllamaModels(ollamaUrl)}
                      >
                        Test &amp; Refresh
                      </button>
                    </div>
                  </div>

                  <div className="form-group full">
                    <label>Connection Status</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: ollamaStatus === 'connected' ? 'var(--success)' : ollamaStatus === 'checking' ? 'var(--warning)' : 'var(--danger)' }}></div>
                      <span style={{ fontSize: '0.9rem' }}>
                        {ollamaStatus === 'connected' ? `Connected — ${ollamaModels.length} model${ollamaModels.length !== 1 ? 's' : ''} available` : ollamaStatus === 'checking' ? 'Checking...' : 'Not connected'}
                      </span>
                    </div>
                  </div>

                  <div className="form-group full">
                    <label>Default Ollama Model</label>
                    <select className="custom-input" value={ollamaDefaultModel} onChange={(e) => setOllamaDefaultModel(e.target.value)}>
                      {ollamaModels.length > 0 ? ollamaModels.map(m => (
                        <option key={m} value={m}>{m}</option>
                      )) : (
                        <option value={ollamaDefaultModel}>{ollamaDefaultModel}</option>
                      )}
                    </select>
                  </div>

                  <div className="form-group full">
                    <label>Available Models</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {ollamaModels.length > 0 ? ollamaModels.map(m => (
                        <span key={m} style={{ padding: '6px 12px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.85rem' }}>{m}</span>
                      )) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Click "Test &amp; Refresh" to load models from Ollama</span>
                      )}
                    </div>
                  </div>

                  <div className="form-group full" style={{ marginTop: '10px', padding: '15px', background: 'var(--bg-input)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                      <strong>Note:</strong> The Manager agent's Model Provider setting determines the engine for the entire panel discussion. If you encounter CORS errors, restart Ollama with:<br />
                      <code style={{ display: 'inline-block', marginTop: '6px', background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '4px' }}>OLLAMA_ORIGINS=* ollama serve</code>
                    </p>
                  </div>

                  <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '20px' }}>🔊 Qwen3-TTS (Local Voice)</h3>
                  </div>

                  <div className="form-group full">
                    <label>Qwen3-TTS Server URL</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input type="text" className="custom-input" style={{ flex: 1 }} value={qwenTtsUrl} onChange={(e) => setQwenTtsUrl(e.target.value)} placeholder="http://localhost:7861" />
                      <button
                        className="custom-input"
                        style={{ cursor: 'pointer', background: 'var(--accent-blue)', color: 'white', border: 'none', whiteSpace: 'nowrap', fontWeight: 600 }}
                        onClick={async () => {
                          setQwenTtsStatus('unknown');
                          try {
                            const res = await fetch(`${qwenTtsUrl}/health`, { signal: AbortSignal.timeout(3000) });
                            const data = await res.json();
                            setQwenTtsStatus(data.status === 'ok' ? 'connected' : 'disconnected');
                          } catch { setQwenTtsStatus('disconnected'); }
                        }}
                      >
                        Test
                      </button>
                    </div>
                  </div>

                  <div className="form-group full">
                    <label>Connection Status</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: qwenTtsStatus === 'connected' ? 'var(--success)' : qwenTtsStatus === 'unknown' ? 'var(--text-muted)' : 'var(--danger)' }}></div>
                      <span style={{ fontSize: '0.9rem' }}>
                        {qwenTtsStatus === 'connected' ? 'Connected — Qwen3-TTS-0.6B ready' : qwenTtsStatus === 'unknown' ? 'Not tested — click Test' : 'Not connected — start with: python qwen_server.py'}
                      </span>
                    </div>
                  </div>

                  <div className="form-group full">
                    <label>Prebuilt Voices</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {QWEN_VOICES.map(v => (
                        <span key={v.id} style={{ padding: '6px 12px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.85rem' }}>
                          <strong>{v.name}</strong> — {v.desc}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="form-group full" style={{ marginTop: '10px', padding: '15px', background: 'var(--bg-input)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                      <strong>Tip:</strong> Select a Qwen3 voice in any agent's Voice Profile dropdown to use local TTS. The TTS provider is auto-detected from the voice selection.
                    </p>
                  </div>

                  {/* ─── Cartesia AI ─── */}
                  <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '20px' }}>🎙️ Cartesia AI (Cloud Voice)</h3>
                  </div>

                  <div className="form-group full">
                    <label>Cartesia API Key</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input
                        type="password"
                        className="custom-input"
                        style={{ flex: 1 }}
                        value={cartesiaApiKey}
                        onChange={(e) => {
                          setCartesiaApiKey(e.target.value);
                          cartesiaApiKeyRef.current = e.target.value;
                          setCartesiaStatus('unknown');
                        }}
                        placeholder="sk_car_..."
                      />
                      <button
                        className="custom-input"
                        style={{ cursor: 'pointer', background: 'var(--accent-blue)', color: 'white', border: 'none', whiteSpace: 'nowrap', fontWeight: 600 }}
                        onClick={async () => {
                          setCartesiaStatus('unknown');
                          const ok = await checkCartesiaKey(cartesiaApiKey);
                          setCartesiaStatus(ok ? 'connected' : 'disconnected');
                        }}
                      >
                        Test
                      </button>
                    </div>
                  </div>

                  <div className="form-group full">
                    <label>Connection Status</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: cartesiaStatus === 'connected' ? 'var(--success)' : cartesiaStatus === 'unknown' ? 'var(--text-muted)' : 'var(--danger)' }}></div>
                      <span style={{ fontSize: '0.9rem' }}>
                        {cartesiaStatus === 'connected' ? 'Connected — Cartesia Sonic-3 ready' : cartesiaStatus === 'unknown' ? 'Not tested — click Test' : 'Invalid API key or network error'}
                      </span>
                    </div>
                  </div>

                  <div className="form-group full" style={{ marginTop: '10px', padding: '15px', background: 'var(--bg-input)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                      <strong>100 voices available.</strong> Select any Cartesia voice in an agent's Voice Profile dropdown. Voices are grouped by language and gender. Default agents use pre-assigned unique Cartesia voices.
                    </p>
                  </div>
                </div>
              ) : agents.length === 0 ? (
                <div style={{ display: 'flex', flex: 1, justifyContent: 'center', alignItems: 'center', flexDirection: 'column', color: 'var(--text-muted)', marginTop: '60px' }}>
                  <UserX size={48} style={{ marginBottom: '15px', opacity: 0.5 }} />
                  <h2 style={{ color: 'var(--text-main)', fontWeight: 600, marginBottom: '8px' }}>No Agents Online</h2>
                  <p style={{ fontSize: '0.95rem' }}>Deploy a new unit to resume strategy simulation.</p>
                  <button onClick={() => setShowSettings(false)} className="custom-input" style={{ marginTop: '24px', width: 'auto', cursor: 'pointer', background: 'var(--accent-blue)', color: 'white', border: 'none' }}>Close Window</button>
                </div>
              ) : activeEditIndex === -1 ? (
                <div className="form-grid">
                  <div className="form-group full">
                    <label>Master System Prompt</label>
                    <textarea 
                      className="custom-input" 
                      style={{ height: '500px', fontFamily: 'monospace', fontSize: '0.85rem' }}
                      value={systemPrompt} 
                      onChange={(e) => setSystemPrompt(e.target.value)} 
                    />
                  </div>
                </div>
              ) : agents[activeEditIndex] && (
                <>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Display Name</label>
                      <input type="text" className="custom-input" value={agents[activeEditIndex].name} onChange={(e) => {
                        const newAgents = [...agents];
                        newAgents[activeEditIndex].name = e.target.value;
                        setAgents(newAgents);
                      }} />
                    </div>

                    <div className="form-group">
                      <label>Role</label>
                      <input type="text" className="custom-input" value={agents[activeEditIndex].role} onChange={(e) => {
                        const newAgents = [...agents];
                        newAgents[activeEditIndex].role = e.target.value;
                        setAgents(newAgents);
                      }} />
                    </div>

                    <div className="form-group">
                      <label>Voice Profile</label>
                      <select className="custom-input" value={agents[activeEditIndex].voice} onChange={(e) => {
                        const newAgents = [...agents];
                        const selectedVoice = e.target.value;
                        newAgents[activeEditIndex].voice = selectedVoice;
                        if (QWEN_VOICES.some(v => v.id === selectedVoice)) {
                          newAgents[activeEditIndex].ttsProvider = 'qwen';
                        } else if (CARTESIA_VOICES.some(v => v.id === selectedVoice)) {
                          newAgents[activeEditIndex].ttsProvider = 'cartesia';
                        } else {
                          newAgents[activeEditIndex].ttsProvider = 'gemini';
                        }
                        setAgents(newAgents);
                      }}>
                        <optgroup label="☁️ Gemini TTS">
                          {GEMINI_VOICES.map(v => <option key={v} value={v}>{v}</option>)}
                        </optgroup>
                        <optgroup label="🖥️ Qwen3 TTS (Local)">
                          {QWEN_VOICES.map(v => <option key={v.id} value={v.id}>{v.name} — {v.desc}</option>)}
                        </optgroup>
                        <optgroup label="🎙️ Cartesia AI — English (Masculine)">
                          {CARTESIA_VOICES.filter(v => v.language === 'en' && v.gender === 'masculine').map(v => (
                            <option key={v.id} value={v.id}>{v.name}</option>
                          ))}
                        </optgroup>
                        <optgroup label="🎙️ Cartesia AI — English (Feminine)">
                          {CARTESIA_VOICES.filter(v => v.language === 'en' && v.gender === 'feminine').map(v => (
                            <option key={v.id} value={v.id}>{v.name}</option>
                          ))}
                        </optgroup>
                        <optgroup label="🌐 Cartesia AI — Multilingual">
                          {CARTESIA_VOICES.filter(v => v.language !== 'en').map(v => (
                            <option key={v.id} value={v.id}>{v.name} ({v.language})</option>
                          ))}
                        </optgroup>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Color Hex</label>
                      <input type="text" className="custom-input" value={agents[activeEditIndex].hex} onChange={(e) => {
                        const newAgents = [...agents];
                        newAgents[activeEditIndex].hex = e.target.value;
                        newAgents[activeEditIndex].rgba = hexToRgb(e.target.value);
                        setAgents(newAgents);
                      }} />
                    </div>

                    <div className="form-group">
                      <label>Model Provider</label>
                      <select className="custom-input" value={agents[activeEditIndex].provider} onChange={(e) => {
                        const newAgents = [...agents];
                        newAgents[activeEditIndex].provider = e.target.value;
                        newAgents[activeEditIndex].modelName = '';
                        setAgents(newAgents);
                      }}>
                        <option value="local">🖥️ Local (Ollama)</option>
                        <option value="cloud">☁️ Cloud (Gemini)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Model</label>
                      <select className="custom-input" value={agents[activeEditIndex].modelName} onChange={(e) => {
                        const newAgents = [...agents];
                        newAgents[activeEditIndex].modelName = e.target.value;
                        setAgents(newAgents);
                      }}>
                        {agents[activeEditIndex].provider === 'local' ? (
                          <>
                            <option value="">Default ({ollamaDefaultModel})</option>
                            {ollamaModels.length > 0
                              ? ollamaModels.map(m => <option key={m} value={m}>{m}</option>)
                              : <option value={ollamaDefaultModel}>{ollamaDefaultModel}</option>
                            }
                          </>
                        ) : (
                          <>
                            <option value="">Default (gemini-2.5-flash)</option>
                            <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                            <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                            <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div className="form-group full">
                      <label>System Prompt (Directives)</label>
                      <textarea className="custom-input" value={agents[activeEditIndex].prompt} onChange={(e) => {
                        const newAgents = [...agents];
                        newAgents[activeEditIndex].prompt = e.target.value;
                        setAgents(newAgents);
                      }} />
                    </div>

                    <div className="form-group">
                      <label>Agent Avatar</label>
                      <div className="file-upload-zone" onClick={() => document.getElementById('avatar-upload')?.click()}>
                        <ImageIcon size={24} style={{ margin: '0 auto 10px auto', color: 'var(--text-muted)' }} />
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Click to upload image</p>
                        <input 
                          type="file" 
                          id="avatar-upload" 
                          style={{ display: 'none' }} 
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                const newAgents = [...agents];
                                newAgents[activeEditIndex].img = reader.result as string;
                                setAgents(newAgents);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Knowledge Database URL</label>
                      <input type="text" className="custom-input" placeholder="https://..." value={agents[activeEditIndex].kbUrl} onChange={(e) => {
                        const newAgents = [...agents];
                        newAgents[activeEditIndex].kbUrl = e.target.value;
                        setAgents(newAgents);
                      }} />
                    </div>
                  </div>

                  <div className="danger-zone">
                    <button className="delete-btn" onClick={() => deleteAgent(activeEditIndex)}>
                      <Trash2 size={16} /> Terminate Node
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
