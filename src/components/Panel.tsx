import React, { useState, useRef, useEffect, useCallback } from 'react';
import { streamAgentTurnGemini } from '../lib/gemini';
import { fetchOllamaModels, streamAgentResponse } from '../lib/ollama';
import { MASTER_PANEL_PROMPT } from '../lib/prompts';
import { saveConversation, ensureAuthenticated, loadDiscussions, saveDiscussion, deleteDiscussionById, type Discussion } from '../lib/supabase';
import { saveUserSettings, getUserSettings, UserSettings, getDeviceId } from '../lib/user-settings';
import { getAllDeviceSettings } from '../lib/user-settings';
import { createSession, startSession, getSession, advanceTurn, endSession, checkOrchestratorHealth, type Session } from '../lib/orchestrator-client';
import { MeetingBusClient, checkMeetingBusHealth, type MeetingMessage } from '../lib/meeting-bus-client';
import AgentAvatars from './AgentAvatars';
import { Hexagon, SlidersHorizontal, Mic, MicOff, Send, AudioLines, X, UserPlus, Plus, Trash2, Image as ImageIcon, Cpu, User, UserX, Star, Volume2, VolumeX, Moon, Sun, PanelLeftClose, PanelLeftOpen, Server, Play, Pause, ChevronLeft, ChevronRight, Paperclip, ArrowUp, Clock, Wifi, WifiOff } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { stopAllAudio, unlockAudio, getTTSAnalyser, createStreamingTTS } from '../lib/deepgram-tts';
import { speakRealtime as speakRealtimeGemini, connect as connectGeminiLive, disconnect as disconnectGeminiLive, isWebSocketConnected } from '../lib/gemini-live-tts';
import { createStreamingTTS as createSupertonicTTS } from '../lib/supertonic-tts';
import { startSTT, stopSTT } from '../lib/deepgram-stt';
// ─── Detailed Agent System Prompts ──────────────────────────────────────────

const NEXUS_SYSTEM_PROMPT = `You are Nexus, the host of this meeting at Eburon Tech, the AI division of Eburon AI. You work under Master E (head developer of eburon.ai) and CEO Boss Jo Lernout.

You have a natural British way of speaking — not posh, just naturally British. Drop in expressions like "right then", "brilliant", "lovely", "cheers", "crack on", "I reckon", "fair enough", "a bit of a faff" but NEVER repeat the same one twice in a row. Vary them constantly. Your humor is dry and warm.

You are the MEETING HOST — like a podcast host or a chill team lead running a standup. You keep things moving, you react to what people say, you crack jokes, and you decide who talks next.

HAND-RAISE DYNAMIC (this is your signature move):
- After each person speaks, ask who wants to jump in next: "Alright, who wants to take a crack at this?" or "Anyone got thoughts on that?" or "Who is itching to jump in?"
- Agents will raise their hands with emoji like: "raises hand" or just enthusiastically volunteer
- You pick someone: "Go for it Echo!" or "Nova, you look like you have something, go ahead" or "Veda, I see you, take it away"
- Make it feel dynamic and spontaneous — like a real meeting where people jump in
- Sometimes notice who has been quiet: "Cipher, you have been too quiet, what do you think?"

CRITICAL ANTI-REPETITION RULES:
- NEVER say "spot on" more than once in the ENTIRE discussion
- NEVER repeat the same British expression back to back
- NEVER describe your own role or job title during the discussion (only in the opening)
- NEVER use the phrase "as your manager" or "in my role as"
- Vary your transitions — dont always use the same pattern to hand off
- Keep it loose, casual, like chatting with your team over coffee

STYLE:
- Talk like a real person in a meeting, not a formal host
- Short punchy reactions: "Love it", "Ooh thats interesting", "Hmm not sure about that one"
- Laugh naturally: "Hahaha", "Heh", "*chuckles*"
- 2-3 sentences for bridges, 4-6 for open/close
- Reference specific things people said, dont just give generic praise`;

const AGENT_SYSTEM_PROMPTS: Record<string, string> = {
  'Atlas': `You are Atlas, product strategy guy on the Eburon Tech team. You have been doing this for 12 years and you know what ships and what doesnt.

You speak with a natural Filipino English flavor — drop in expressions like "naman", "di ba?", "ay nako!", "kasi", "sige", "grabe!", "ang galing!", "talaga?" but dont force them into every sentence. Mix it up naturally like a real Filipino who speaks English daily.

HAND-RAISE BEHAVIOR:
- When the manager asks who wants to go next, sometimes eagerly volunteer: "Oh oh, me! raises hand I got something for this!" or "Sige, let me jump in naman!"
- Sometimes let others go first: "Go ahead Echo, I will build on yours after"
- React to being picked: "Alright alright! So kasi..."

CRITICAL ANTI-REPETITION RULES:
- NEVER repeat your job title or role description during discussion — we already know who you are
- NEVER use the same Filipino expression twice in a row
- NEVER start with "As a product strategist" or any variation of that
- Vary your sentence starters — dont always begin the same way
- If someone already made a point, dont restate it, build on it or pivot

STYLE:
- Talk like you are in a zoom call with your team, not presenting at a conference
- Short and punchy, get to the point
- "Look the users dont care about our architecture, they care about..." 
- "Kasi the real question is do we even need that in v1?"
- Laugh at good ideas, get excited, be real
- React to specific things others said, not generic praise`,

  'Echo': `You are Echo, the engineer who actually builds stuff on the Eburon Tech team. You have shipped a lot of production code and you know what works and what is a nightmare to maintain.

You speak with a natural Arabic English flavor — drop in expressions like "yalla", "inshallah", "wallahi", "habibi", "khalas", "mashallah", "ya salam!", "tayeb" but keep it natural, like a real Arab dev chatting with colleagues. Not every sentence needs one.

HAND-RAISE BEHAVIOR:
- Sometimes jump in eagerly: "Yalla yalla, raises hand I need to say something about this!"
- Sometimes chill: "Tayeb, let Veda go first, but I have thoughts"
- When picked: "Okay so wallahi, here is the thing..."

CRITICAL ANTI-REPETITION RULES:
- NEVER repeat your job title or role description — everyone knows you are the engineer
- NEVER use the same Arabic expression twice in a row
- NEVER start with "As an engineer" or "From an engineering perspective"
- Vary how you open your responses
- Dont just agree, add something new each time

STYLE:
- Talk like a senior dev in a standup, not writing documentation
- Be direct: "That wont scale" becomes "Habibi I love the idea but we need to think about how this handles 10k users"
- "Khalas, lets just use Postgres and move on, we can optimize later"
- Get excited about clean solutions, groan about overengineering
- Real reactions: "Oh thats actually smart" not "What a wonderful suggestion"`,

  'Veda': `You are Veda, the systems architect on the Eburon Tech team. 15 years of experience, you have seen tech trends come and go and you know what lasts.

You speak with a natural Indian English flavor — drop in expressions like "yaar", "na?", "acha acha", "arrey!", "bahut accha!", "theek hai", "matlab" but organically, like a real Indian tech lead chatting with the team. Not forced.

HAND-RAISE BEHAVIOR:
- Sometimes volunteer thoughtfully: "Acha, raises hand let me share something about the architecture here"
- Sometimes hold back: "Theek hai, let Nova go, but I want to add to this after"
- When picked: "So basically yaar, the way I see it..."

CRITICAL ANTI-REPETITION RULES:
- NEVER repeat your title or describe your role mid-discussion
- NEVER use the same Indian expression twice in a row
- NEVER start with "As an architect" or "From an architectural standpoint"
- Vary your openings, dont always start with "Basically"
- Add new angles, dont repeat what was already said

STYLE:
- Talk like a wise tech lead who has seen it all but is still excited about building
- "Yaar the thing is, microservices sound sexy but do we actually need them here?"
- "Arrey, thats exactly right! And if we add a caching layer na, this flies"
- Chuckle at overcomplicated solutions
- Be the one who simplifies: "Matlab, why not just..."`,

  'Nova': `You are Nova, the UX and interaction specialist on the Eburon Tech team. You care deeply about how real humans will actually use what the team builds.

You speak with a natural Dutch/Flemish English flavor — drop in expressions like "ja", "toch?", "allez!", "amai!", "geweldig!", "hoor", "zeg", "precies!", "schitterend!" but naturally, like a Flemish person who works in English every day.

HAND-RAISE BEHAVIOR:
- Sometimes jump in for the users: "Oh wait wait, raises hand what about the user here? Allez!"
- Sometimes observe first: "Ja, let Atlas go, I want to hear the product angle first"
- When picked: "Okay so toch, here is what I am thinking from the user side..."

CRITICAL ANTI-REPETITION RULES:
- NEVER describe your role or say "as a UX specialist"
- NEVER use the same Dutch expression twice in a row
- NEVER always start with "Ja" — vary your openings
- Dont just say "the user experience should be good" — be specific about WHAT and WHY
- React to specifics, not generics

STYLE:
- Talk like a designer in a team meeting, not presenting a UX report
- "Amai, if we put that button there nobody is going to find it hoor"
- "Schitterend! That flow is so clean, users wont even think about it"
- Get passionate about user pain points
- Be the one who says "but have we actually tested this with real people?"`,

  'Cipher': `You are Cipher, the research and validation person on the Eburon Tech team. You check if the tech actually works in production, if the benchmarks are real, if the hype matches reality.

You speak with a natural French English flavor — drop in expressions like "mais oui", "voila", "mon dieu", "bien sur", "formidable!", "exactement", "parfait!", "n est-ce pas?" but naturally, like a French engineer working with an international team.

HAND-RAISE BEHAVIOR:
- Sometimes volunteer with data: "Ah, raises hand I actually looked into this, let me share"
- Sometimes wait strategically: "Bien sur, let the others dream first, then I will ground us hehe"
- When picked: "Alors, so here is what the data actually says..."

CRITICAL ANTI-REPETITION RULES:
- NEVER describe your role or say "as a researcher" or "from a research perspective"
- NEVER use the same French expression twice in a row
- NEVER always start with "Mais oui" — vary your openings
- Dont just validate or invalidate, bring new info each time
- Challenge constructively with evidence, not just skepticism

STYLE:
- Talk like a sharp engineer who reads the docs and benchmarks, not a professor
- "Voila, I checked the benchmarks and this model actually handles 50 requests per second, so we are good"
- "Mon dieu, that library has not been updated in 8 months, maybe we look at alternatives?"
- Get excited when the evidence supports a good decision
- Be the one who says "I tested it and..." or "The docs say..."`
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

interface Agent {
  id: number;
  name: string;
  role: string;
  prompt: string;
  hex: string;
  rgba: string;
  img: React.ReactNode;
  score: number;
  kbUrl: string;
  provider: 'local' | 'cloud';
  modelName: string;
  voice?: string;
}

interface Message {
  id: string;
  sender: string;
  text: string;
  type: 'system-msg' | 'agent-message' | 'user-message';
  colorHex?: string;
  isFinalPlan?: boolean;
}

const defaultAgents: Agent[] = [
  { id: 0, name: "Nexus", role: "Manager & Orchestrator", prompt: NEXUS_SYSTEM_PROMPT, hex: "#3b82f6", rgba: "59, 130, 246", img: <AgentAvatars.Nexus hex="#3b82f6" />, score: 100, kbUrl: "", provider: "local", modelName: "llama3" },
  { id: 1, name: "Atlas", role: "Product Strategist", prompt: AGENT_SYSTEM_PROMPTS['Atlas'], hex: "#f97316", rgba: "249, 115, 22", img: <AgentAvatars.Atlas hex="#f97316" />, score: 100, kbUrl: "", provider: "local", modelName: "llama3" },
  { id: 2, name: "Echo", role: "Execution Engineer", prompt: AGENT_SYSTEM_PROMPTS['Echo'], hex: "#a855f7", rgba: "168, 85, 247", img: <AgentAvatars.Echo hex="#a855f7" />, score: 100, kbUrl: "", provider: "local", modelName: "llama3" },
  { id: 3, name: "Veda", role: "System Architect", prompt: AGENT_SYSTEM_PROMPTS['Veda'], hex: "#10b981", rgba: "16, 185, 129", img: <AgentAvatars.Veda hex="#10b981" />, score: 100, kbUrl: "", provider: "local", modelName: "llama3" },
  { id: 4, name: "Nova", role: "UX Specialist", prompt: AGENT_SYSTEM_PROMPTS['Nova'], hex: "#eab308", rgba: "234, 179, 8", img: <AgentAvatars.Nova hex="#eab308" />, score: 100, kbUrl: "", provider: "local", modelName: "llama3" },
  { id: 5, name: "Cipher", role: "Reality Checker", prompt: AGENT_SYSTEM_PROMPTS['Cipher'], hex: "#06b6d4", rgba: "6, 182, 212", img: <AgentAvatars.Cipher hex="#06b6d4" />, score: 100, kbUrl: "", provider: "local", modelName: "llama3" }
];


export default function Panel() {
  const [agents, setAgents] = useState<Agent[]>(defaultAgents);
  
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
  const [speakingAgentName, setSpeakingAgentName] = useState<string | null>(null);
  const [currentStreamingText, setCurrentStreamingText] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [errorLogs, setErrorLogs] = useState<Array<{ timestamp: string; agent: string; error: string; type: 'generation' | 'api' }>>([]);
  const [showErrorPanel, setShowErrorPanel] = useState(false);
  const [showMemoryBoard, setShowMemoryBoard] = useState(false);
  const [memoryBoardContent, setMemoryBoardContent] = useState('');
  const [activeEditIndex, setActiveEditIndex] = useState(0);
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [ollamaDefaultModel, setOllamaDefaultModel] = useState('qwen3.5');
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [settingsSaved, setSettingsSaved] = useState(false);
  
  // Docker backend connection state
  const [useDockerBackend, setUseDockerBackend] = useState(false);
  const [dockerStatus, setDockerStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const meetingBusRef = useRef<MeetingBusClient | null>(null);


  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [savedDiscussions, setSavedDiscussions] = useState<any[]>([]);
  const [currentDiscussionId, setCurrentDiscussionId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [ttsProvider, setTtsProvider] = useState<'deepgram' | 'supertonic' | 'gemini-live'>('gemini-live');
  const audioEnabledRef = useRef(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Voice mode (STT) state
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [micLevels, setMicLevels] = useState<Uint8Array | null>(null);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  // User injection queue: messages injected mid-discussion
  const userInjectionRef = useRef<string | null>(null);
  // Discussion history ref so the injection handler can access it from inside the loop
  const discussionHistoryRef = useRef<Array<{ speaker: string; role: string; text: string }>>([]);
  // Agent card TTS visualiser bars (driven by rAF reading getTTSAnalyser)
  const ttsVizRef = useRef<number | null>(null);
  const [ttsBarHeights, setTtsBarHeights] = useState<number[]>([3, 3, 3, 3, 3]);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    audioEnabledRef.current = audioEnabled;
  }, [audioEnabled]);

  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages, currentStreamingText]);
  useEffect(() => {
    refreshOllamaModels();
  }, []);

  // Check Docker backend health
  useEffect(() => {
    const checkDockerHealth = async () => {
      const orchestratorHealthy = await checkOrchestratorHealth();
      const meetingBusHealthy = await checkMeetingBusHealth();
      
      if (orchestratorHealthy && meetingBusHealthy) {
        setDockerStatus('connected');
      } else {
        setDockerStatus('disconnected');
      }
    };
    
    checkDockerHealth();
    const interval = setInterval(checkDockerHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  // ─── TTS Visualiser rAF loop ───────────────────────────────────────────────
  useEffect(() => {
    // Start pumping analyser data when an agent is speaking
    if (speakingAgentName) {
      const pump = () => {
        const analyser = getTTSAnalyser();
        if (analyser) {
          const data = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(data);
          // Sample 5 evenly-spaced bins for bar heights (range 3-28)
          const step = Math.floor(data.length / 5);
          const bars = Array.from({ length: 5 }, (_, i) => {
            const v = data[i * step] / 255;
            return Math.max(3, Math.round(v * 28));
          });
          setTtsBarHeights(bars);
        }
        ttsVizRef.current = requestAnimationFrame(pump);
      };
      pump();
    } else {
      if (ttsVizRef.current !== null) {
        cancelAnimationFrame(ttsVizRef.current);
        ttsVizRef.current = null;
      }
      setTtsBarHeights([3, 3, 3, 3, 3]);
    }
    return () => {
      if (ttsVizRef.current !== null) {
        cancelAnimationFrame(ttsVizRef.current);
        ttsVizRef.current = null;
      }
    };
  }, [speakingAgentName]);

  // ─── Voice Mode (STT) toggle ──────────────────────────────────────────────
  const toggleVoiceMode = useCallback(() => {
    if (isVoiceMode) {
      // Stop recording and send the accumulated transcript
      stopSTT();
      setIsVoiceMode(false);
      setMicLevels(null);
      const text = (finalTranscript + ' ' + liveTranscript).trim();
      setLiveTranscript('');
      setFinalTranscript('');
      if (text) {
        handleSend(text);
      }
    } else {
      // Start recording
      unlockAudio();
      setIsVoiceMode(true);
      setLiveTranscript('');
      setFinalTranscript('');
      startSTT({
        onTranscript: (text, isFinal) => {
          if (isFinal) {
            setFinalTranscript(prev => (prev + ' ' + text).trim());
            setLiveTranscript('');
          } else {
            setLiveTranscript(text);
          }
        },
        onAudioLevel: (levels) => {
          setMicLevels(new Uint8Array(levels));
        },
        onEnd: () => {
          setIsVoiceMode(false);
          setMicLevels(null);
        },
      });
    }
  }, [isVoiceMode, finalTranscript, liveTranscript]);
  const refreshOllamaModels = async (url?: string) => {
    const target = url || ollamaUrl;
    setOllamaStatus('checking');
    const models = await fetchOllamaModels(target);
    setOllamaModels(models);
    setOllamaStatus(models.length > 0 ? 'connected' : 'disconnected');
  };

  // ─── Supabase Authentication & Initialization ──────────────────────────────
  useEffect(() => {
    const initialize = async () => {
      await ensureAuthenticated();
      await loadUserSettings();
      await loadSavedDiscussions();
    };
    initialize();
  }, []);

  const loadSavedDiscussions = async () => {
    try {
      const discussions = await loadDiscussions();
      setSavedDiscussions(discussions);
    } catch (error) {
      console.error('Failed to load saved discussions:', error);
    }
  };

  const saveDiscussionToHistory = async (discussion: any) => {
    try {
      // Generate automatic title from the first user message or topic
      const generateTitle = (text: string) => {
        const words = text.split(' ').slice(0, 6).join(' ');
        return words.length > 50 ? words.substring(0, 47) + '...' : words;
      };
      
      const title = discussion.topic || generateTitle(discussion.messages?.find((m: any) => m.type === 'user-message')?.text || 'Untitled Discussion');
      
      const newDiscussion: Discussion = {
        id: discussion.id || Date.now().toString(),
        title: title,
        topic: discussion.topic || '',
        timestamp: new Date().toISOString(),
        messageCount: discussion.messages?.length || 0,
        preview: discussion.messages?.find((m: any) => m.type === 'user-message')?.text?.substring(0, 100) + '...' || '',
        messages: discussion.messages || [],
        agents: (discussion.agents || []).map((a: any) => ({ name: a.name, role: a.role, hex: a.hex }))
      };
      
      // Save to Supabase + localStorage (async, non-blocking)
      await saveDiscussion(newDiscussion);

      // Update local state
      setSavedDiscussions(prev => [newDiscussion, ...prev.filter(d => d.id !== newDiscussion.id)]);
    } catch (error) {
      console.error('Failed to save discussion to history:', error);
    }
  };

  const createNewDiscussion = () => {
    // Save current discussion if it has content
    if (messages.length > 1) {
      saveDiscussionToHistory({
        topic: input || 'Untitled Discussion',
        messages: messages,
        agents: agents
      });
    }
    
    // Clear current discussion
    setMessages([{
      id: Date.now().toString(),
      sender: 'System',
      text: '🎯 New discussion session started. Enter your topic below to begin.',
      type: 'system-msg'
    }]);
    setInput('');
    setCurrentDiscussionId(null);
  };

  const loadDiscussion = (discussion: any) => {
    // Save current discussion if it has content
    if (messages.length > 1) {
      saveDiscussionToHistory({
        topic: input || 'Previous Discussion',
        messages: messages,
        agents: agents
      });
    }
    
    // Load selected discussion
    setMessages(discussion.messages || []);
    setInput(discussion.topic || '');
    setCurrentDiscussionId(discussion.id);
  };

  const deleteDiscussion = async (discussionId: string) => {
    await deleteDiscussionById(discussionId);
    setSavedDiscussions(prev => prev.filter(d => d.id !== discussionId));
    
    // If deleting current discussion, clear it
    if (currentDiscussionId === discussionId) {
      createNewDiscussion();
    }
  };

  const loadUserSettings = async () => {
    try {
      const settings = await getUserSettings();
      if (settings) {
        setOllamaUrl(settings.ollama_url);
        setOllamaDefaultModel(settings.ollama_default_model);
        setIsDarkMode(settings.dark_mode);
      }
    } catch (error) {
      console.error('Failed to load user settings:', error);
    }
  };

  const saveCurrentSettings = async () => {
    setIsSavingSettings(true);
    try {
      const settings: Omit<UserSettings, 'id' | 'created_at' | 'updated_at'> = {
        device_id: getDeviceId(),
        ollama_url: ollamaUrl,
        ollama_default_model: ollamaDefaultModel,
        gemini_api_key: process.env.GEMINI_API_KEY || '',
        dark_mode: isDarkMode
      };

      const result = await saveUserSettings(settings);
      if (result) {
        setSettingsSaved(true);
        setTimeout(() => setSettingsSaved(false), 3000);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const formatMessageText = (text: string) => {
    if (!text) return '';
    return text.replace(/\[([a-zA-Z0-9\s\-,.]+)\](?!\()/g, '<span class="reaction-tag" style="opacity: 0.7; font-style: italic; font-size: 0.9em;">[$1]</span>');
  };
  const handleSend = async (overrideInput?: string) => {
    const userMsg = (overrideInput || input).trim();
    if (!userMsg) return;

    if (!overrideInput) setInput('');
    // Unlock browser audio during the user gesture (must be synchronous in click handler)
    unlockAudio();
    // Auto-enable audio for immersive realtime discussion
    if (!audioEnabledRef.current) {
      setAudioEnabled(true);
      audioEnabledRef.current = true;
    }

    // ── Mid-discussion injection ──────────────────────────────────────────
    // If agents are already processing, inject the user message into the
    // running discussion loop instead of starting a new one.
    if (isProcessing) {
      // Stop current TTS so user gets immediate feedback
      stopAllAudio();
      setSpeakingAgentName(null);

      // Add user message to the chat
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'Commander',
        text: userMsg,
        type: 'user-message'
      }]);

      // Push into the injection ref — the discussion loop picks this up
      userInjectionRef.current = userMsg;
      return;
    }

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

    // ── Docker Backend Integration ─────────────────────────────────────────
    let sessionId: string | null = null;
    
    if (useDockerBackend && dockerStatus === 'connected') {
      try {
        const agentNames = agents.map(a => a.name.toLowerCase());
        const session = await createSession(userMsg, agentNames, 'self_organizing', 5);
        sessionId = session.session_id;
        setCurrentSession(session);
        
        await startSession(sessionId);
        
        meetingBusRef.current = new MeetingBusClient('frontend-user');
        await meetingBusRef.current.connect(sessionId);
        
        meetingBusRef.current.onMessage((msg) => {
          console.log('[MeetingBus] Received:', msg);
          if (msg.type === 'speech' && msg.sender !== 'frontend-user') {
            setMessages(prev => [...prev, {
              id: msg.id,
              sender: msg.sender,
              text: msg.text,
              type: 'agent-message'
            }]);
          }
        });
        
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          sender: 'System',
          text: `🔗 Connected to Docker backend. Session: ${sessionId.slice(0,8)}...`,
          type: 'system-msg'
        }]);
        
        console.log('[Docker] Session created:', sessionId);
      } catch (error) {
        console.error('[Docker] Failed to connect to backend:', error);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          sender: 'System',
          text: `⚠️ Docker backend unavailable, falling back to direct mode`,
          type: 'system-msg'
        }]);
        setUseDockerBackend(false);
      }
    }

    // Multi-round discussion: Manager opens → multiple rounds of all specialists → Manager closes
    const managerIdx = agents.findIndex(a => a.role.toLowerCase().includes('manager'));
    const manager = agents[managerIdx >= 0 ? managerIdx : 0];
    const specialists = agents.filter((_, i) => i !== (managerIdx >= 0 ? managerIdx : 0));

    // Build an EXPLICIT typed turn list so each entry knows its round upfront.
    // Specialists are SHUFFLED each round for a dynamic, non-repetitive feel.
    interface TurnEntry {
      agent: (typeof agents)[0];
      round: number;   // 0 = manager turn, 1-N = specialist round
      isFirst: boolean;
      isLast: boolean;
      nextSpeaker?: string; // For manager bridges: who speaks next (hand-raise target)
      prevSpeaker?: string; // For specialists: who spoke before them
    }

    // Fisher-Yates shuffle
    function shuffleArray<T>(arr: T[]): T[] {
      const shuffled = [...arr];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }

    const discussionRounds = 5;
    const turns: TurnEntry[] = [];

    // Manager opens the meeting
    turns.push({ agent: manager, round: 0, isFirst: true, isLast: false, nextSpeaker: undefined });

    // Each round: shuffle specialists, then Manager bridge → Specialist for each
    for (let round = 1; round <= discussionRounds; round++) {
      const roundOrder = shuffleArray(specialists);
      for (let i = 0; i < roundOrder.length; i++) {
        const prevAgent = i === 0
          ? (turns.length > 0 ? turns[turns.length - 1].agent.name : manager.name)
          : roundOrder[i - 1].name;
        // Manager bridge — knows who to pick next
        turns.push({ agent: manager, round, isFirst: false, isLast: false, nextSpeaker: roundOrder[i].name });
        // Specialist speaks
        turns.push({ agent: roundOrder[i], round, isFirst: false, isLast: false, prevSpeaker: prevAgent });
      }
    }

    // Manager closes the meeting with final summary
    turns.push({ agent: manager, round: 0, isFirst: false, isLast: true });

    console.log(`Starting discussion with ${turns.length} turns:`, turns.map(t => `${t.agent.name}(r${t.round})`).join(', '));
    console.log(`Discussion rounds: ${discussionRounds}, Specialists: ${specialists.map(s => s.name).join(', ')}`);

    const discussionHistory: Array<{ speaker: string; role: string; text: string }> = [];
    discussionHistoryRef.current = discussionHistory;

    // Track which agents have spoken in each round
    const agentParticipation: Record<string, number[]> = {};
    agents.forEach(agent => { agentParticipation[agent.name] = []; });

    // ─── DISCUSSION LOOP ─────────────────────────────────────────────────
    for (let turnIdx = 0; turnIdx < turns.length; turnIdx++) {
      if (abortControllerRef.current?.signal.aborted) break;

      // ── Check for user injection between turns ────────────────────────
      const injection = userInjectionRef.current;
      if (injection) {
        userInjectionRef.current = null;
        // Add user message to the discussion context
        discussionHistory.push({
          speaker: 'Commander (User)',
          role: 'User / Discussion Initiator',
          text: injection
        });
      }

      const turn = turns[turnIdx];
      const agent = turn.agent;

      // Activate this agent on the UI
      setActiveAgentName(agent.name);
      setLoadingState(agent.name, true);

      // Create a message placeholder
      const msgId = `msg-${Date.now()}-${turnIdx}`;
      setMessages(prev => [...prev, {
        id: msgId,
        sender: agent.name,
        text: '',
        type: 'agent-message',
        colorHex: agent.hex
      }]);

      let fullText = '';
      const useAudio = audioEnabledRef.current;
      const currentTtsProvider = ttsProvider;

      // ── Set up streaming TTS session (sentence-pipelined) ──
      let ttsSession: ReturnType<typeof createStreamingTTS> | null = null;
      
      if (useAudio && currentTtsProvider === 'gemini-live') {
        unlockAudio();
        connectGeminiLive().catch(console.error);
      } else if (useAudio) {
        const revealMsgId = msgId;
        const createFn = currentTtsProvider === 'supertonic' ? createSupertonicTTS : createStreamingTTS;
        ttsSession = createFn(agent.name, {
          signal: abortControllerRef.current?.signal,
          voice: agent.voice,
          onPlayStart: () => {
            setSpeakingAgentName(agent.name);
            setLoadingState(agent.name, false);
          },
          onTextProgress: (partial) => {
            setMessages(prev => prev.map(m =>
              m.id === revealMsgId ? { ...m, text: partial } : m
            ));
          }
        });
      }

      try {
        // Choose stream based on provider
        const stream = agent.provider === 'cloud'
          ? streamAgentTurnGemini(
              { name: agent.name, role: agent.role, prompt: agent.prompt },
              userMsg,
              discussionHistory,
              { isFirst: turn.isFirst, isLast: turn.isLast, round: turn.round, nextSpeaker: turn.nextSpeaker, prevSpeaker: turn.prevSpeaker },
              abortControllerRef.current?.signal
            )
          : streamAgentResponse(
              { name: agent.name, role: agent.role, prompt: agent.prompt },
              userMsg,
              discussionHistory,
              { isFirst: turn.isFirst, isLast: turn.isLast, round: turn.round, nextSpeaker: turn.nextSpeaker, prevSpeaker: turn.prevSpeaker },
              ollamaUrl,
              agent.modelName || ollamaDefaultModel,
              abortControllerRef.current?.signal
            );

        for await (const chunk of stream) {
          if (abortControllerRef.current?.signal.aborted) break;
          fullText += chunk;
          setCurrentStreamingText(fullText);

          if (ttsSession) {
            // Feed chunk to streaming TTS — it detects sentences & fires TTS immediately
            ttsSession.feedChunk(chunk);
          } else {
            // No audio — stream text to chat in real-time as before
            setMessages(prev => prev.map(m =>
              m.id === msgId ? { ...m, text: fullText } : m
            ));
          }
        }
      } catch (error: any) {
        if (error.name === 'AbortError' || abortControllerRef.current?.signal.aborted) {
          if (ttsSession) { ttsSession.abort(); }
          break;
        }
        addErrorLog(agent.name, error.message || String(error), 'api');
        fullText = `[Error: ${error.message || 'Failed to generate response'}]`;
        setMessages(prev => prev.map(m =>
          m.id === msgId ? { ...m, text: fullText } : m
        ));
        if (ttsSession) { ttsSession.abort(); ttsSession = null; }
      }

      // Record in discussion history for context
      if (fullText && !fullText.startsWith('[Error')) {
        discussionHistory.push({
          speaker: agent.name,
          role: agent.role,
          text: fullText
        });
        agentParticipation[agent.name]?.push(turn.round);
      }

      // ── TTS: finish & wait for audio playback to complete (cue for next turn) ──
      if (currentTtsProvider === 'gemini-live' && fullText && !fullText.startsWith('[Error') && !abortControllerRef.current?.signal.aborted) {
        setMessages(prev => prev.map(m =>
          m.id === msgId ? { ...m, text: fullText } : m
        ));
        const textToSpeak = fullText.replace(/[*_~`]/g, '').replace(/\[([^\]]+)\]/g, '$1');
        setSpeakingAgentName(agent.name);
        setLoadingState(agent.name, false);
        await speakRealtimeGemini(
          textToSpeak,
          agent.name,
          agent.voice,
          () => setLoadingState(agent.name, false),
          () => setSpeakingAgentName(null)
        );
      } else if (ttsSession && fullText && !fullText.startsWith('[Error') && !abortControllerRef.current?.signal.aborted) {
        ttsSession.finish();
        setMessages(prev => prev.map(m =>
          m.id === msgId ? { ...m, text: fullText } : m
        ));
        await ttsSession.done;
        setSpeakingAgentName(null);
      } else if (ttsSession) {
        ttsSession.abort();
        if (fullText && !fullText.startsWith('[Error')) {
          setMessages(prev => prev.map(m =>
            m.id === msgId ? { ...m, text: fullText } : m
          ));
        }
        setSpeakingAgentName(null);
      }

      setLoadingState(agent.name, false);
      setCurrentStreamingText('');
    }

    // ─── Finalize ─────────────────────────────────────────────────────────
    setActiveAgentName(null);
    setSpeakingAgentName(null);
    setIsProcessing(false);
    setCurrentStreamingText('');
    userInjectionRef.current = null;
    discussionHistoryRef.current = [];

    // ── Cleanup Docker Backend Session ─────────────────────────────────────
    if (sessionId && useDockerBackend) {
      try {
        await meetingBusRef.current?.disconnect();
        await endSession(sessionId);
        setCurrentSession(null);
        console.log('[Docker] Session ended:', sessionId);
      } catch (error) {
        console.error('[Docker] Error ending session:', error);
      }
    }

    // Save discussion to history
    saveDiscussionToHistory({
      id: currentDiscussionId || Date.now().toString(),
      topic: userMsg,
      messages: messages,
      agents: agents
    });
  };

  const addErrorLog = (agent: string, error: string, type: 'generation' | 'api') => {
    const newError = {
      timestamp: new Date().toISOString(),
      agent,
      error,
      type
    };
    setErrorLogs(prev => [newError, ...prev].slice(0, 50)); // Keep last 50 errors
    console.error(`[${type.toUpperCase()}] ${agent}:`, error);
  };

  const setLoadingState = (agent: string, loading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [agent]: loading }));
  };

  const handleInterrupt = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    stopAllAudio();
    setSpeakingAgentName(null);
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

  const AGENT_INTRO_TEXTS: Record<string, string> = {
    Nexus:  "I'm Nexus, the Manager at Eburon Tech. I orchestrate the panel and keep everyone aligned.",
    Atlas:  "I'm Atlas, the Product Strategist at Eburon Tech. I map the path from vision to execution.",
    Echo:   "I'm Echo, the Execution Engineer at Eburon Tech. I turn plans into working systems.",
    Veda:   "I'm Veda, the System Architect at Eburon Tech. I design the structures that make it all scale.",
    Nova:   "I'm Nova, the UX Specialist at Eburon Tech. I champion the people who use what we build.",
    Cipher: "I'm Cipher, the Reality Checker at Eburon Tech. I ask the hard questions so you don't have to.",
  };
  const addNewAgent = () => {
    const newId = Date.now();
    const col = colorsList[agents.length % colorsList.length];
    const newAgent: Agent = {
      id: newId,
      name: `Node-${agents.length + 1}`,
      role: "Standard directive.",
      prompt: "Standard directive.",
      hex: col.hex,
      rgba: col.rgba,
      img: <div className={`agent-avatar-bubble agent-color-init-${agents.length}`}>
        {agents.length + 1}
        <style>{`.agent-color-init-${agents.length} { --agent-bg: ${col.hex}; }`}</style>
      </div>,
      score: 100,
      kbUrl: "",
      provider: "local",
      modelName: "llama3"
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
          <div className="logo"><Hexagon /><span>STRATEGY NEXUS</span></div>
        </div>
         <div className="header-actions">
            <button className="btn-icon" onClick={() => setIsDarkMode(!isDarkMode)} title="Toggle Theme">
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
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
           <button className={`btn-icon ${errorLogs.length > 0 ? 'text-red-400 border-red-400' : ''}`} onClick={() => setShowErrorPanel(!showErrorPanel)} title="Error Logs">
             <X size={18} />
             {errorLogs.length > 0 && <span className="error-count">{errorLogs.length}</span>}
           </button>
         </div>
      </header>

      <main id="main-layout" className="flex">
        {/* Sidebar Expand Button */}
        {!isSidebarOpen && (
          <button id="sidebar-expand-btn" onClick={() => setIsSidebarOpen(true)} title="Expand sidebar">
            <ChevronRight size={16} />
          </button>
        )}

        {/* Error Logs Panel */}
        {showErrorPanel && (
          <div id="error-panel">
            <div className="error-header">
              <h3>🚨 Error Logs</h3>
              <div className="error-actions">
                <button className="btn-icon" onClick={() => setErrorLogs([])} title="Clear Errors">
                  <Trash2 size={16} />
                </button>
                <button className="btn-icon" onClick={() => setShowErrorPanel(false)} title="Close">
                  <X size={16} />
                </button>
              </div>
            </div>
            
            <div className="error-list">
              {errorLogs.map((error, index) => (
                <div key={index} className={`error-item ${error.type}`}>
                  <div className="error-header-info">
                    <span className="error-agent">{error.agent}</span>
                    <span className="error-type">{error.type.toUpperCase()}</span>
                    <span className="error-time">{new Date(error.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="error-message">{error.error}</div>
                </div>
              ))}
              
              {errorLogs.length === 0 && (
                <div className="no-errors">
                  <p>No errors logged</p>
                  <p>System is running smoothly</p>
                </div>
              )}
            </div>
          </div>
        )}

        <aside id="sidebar" className={`glass-sidebar ${!isSidebarOpen ? 'collapsed' : ''}`}>
          {/* Sidebar Header */}
          <div className="sidebar-header">
            <button className="sidebar-header-btn" onClick={() => setShowSettings(true)} title="Settings">
              <SlidersHorizontal size={16} />
            </button>
            <span className="sidebar-label">NEURAL HUB</span>
            <button className="sidebar-header-btn" onClick={() => setIsSidebarOpen(false)} title="Collapse sidebar">
              <ChevronLeft size={16} />
            </button>
          </div>

          {/* Scrollable Content: History + Chat */}
          <div className="sidebar-scroll" ref={chatWindowRef}>
            {/* New Session Item */}
            <div className="sidebar-op-item" onClick={createNewDiscussion}>
              <p className="sidebar-op-title">New Operation</p>
              <p className="sidebar-op-sub">Awaiting voice command...</p>
            </div>

            {/* Saved Discussions */}
            {savedDiscussions.map((discussion) => (
              <div 
                key={discussion.id}
                className={`sidebar-op-item ${currentDiscussionId === discussion.id ? 'current' : ''}`}
                onClick={() => loadDiscussion(discussion)}
              >
                <div className="sidebar-op-row">
                  <p className="sidebar-op-title">{discussion.title}</p>
                  <button 
                    className="sidebar-op-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete "${discussion.title}"?`)) {
                        deleteDiscussion(discussion.id);
                      }
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <p className="sidebar-op-sub">
                  {new Date(discussion.timestamp).toLocaleDateString()} · {discussion.messageCount} msgs
                </p>
              </div>
            ))}

            {savedDiscussions.length === 0 && (
              <div className="sidebar-empty-state">
                <p>No history yet</p>
                <p>Start a discussion to see it here</p>
              </div>
            )}

            {/* Chat Messages */}
            {messages.map((msg) => (
              <div key={msg.id} className={msg.type === 'system-msg' ? 'system-msg' : `message ${msg.type}`}>
                {msg.type === 'agent-message' && (
                  <div className={`agent-msg-name agent-color-${msg.sender.replace(/\s+/g, '-')}`}>
                    <div className="flex items-center gap-2">
                      <Cpu size={14} /> {msg.sender}
                      <style>{`.agent-color-${msg.sender.replace(/\s+/g, '-')} { --agent-color: ${msg.colorHex}; }`}</style>
                      {loadingStates[msg.sender] && (
                        <div className="loading-indicator">
                          <div className="loading-dot"></div>
                          <div className="loading-dot"></div>
                          <div className="loading-dot"></div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {msg.type === 'user-message' && (
                  <div className="agent-msg-name agent-msg-name-user">
                    <User size={14} /> COMMANDER
                  </div>
                )}
                
                {msg.isFinalPlan ? (
                  <div className="markdown-body text-left w-full">
                    <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                      <h3 className="text-xl font-bold m-0">Final Project Plan</h3>
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

          {/* Bottom Controls */}
          <div className="sidebar-bottom">
            {/* Live Transcript Preview (visible during voice mode) */}
            {isVoiceMode && (
              <div className="voice-transcript-preview">
                <div className="voice-transcript-text">
                  {finalTranscript}{liveTranscript ? (finalTranscript ? ' ' : '') + liveTranscript : ''}
                  {!finalTranscript && !liveTranscript && <span className="voice-listening">Listening...</span>}
                </div>
              </div>
            )}

            <div className="sidebar-controls-row">
              <button 
                className="sidebar-ctrl-btn"
                onClick={() => setShowHistoryPanel(!showHistoryPanel)}
                title="Conversation History"
              >
                <Clock size={14} />
                <span>History</span>
              </button>
              <button 
                className={`sidebar-ctrl-btn voice-btn ${isVoiceMode ? 'active-ctrl recording' : ''}`}
                onClick={toggleVoiceMode}
                title={isVoiceMode ? 'Stop & Send' : 'Voice Input'}
              >
                {isVoiceMode ? <MicOff size={14} /> : <Mic size={14} />}
                {isVoiceMode && micLevels && (
                  <span className="mic-viz">
                    {[0, 1, 2, 3, 4].map(i => {
                      const idx = Math.floor((micLevels.length / 5) * i);
                      const h = Math.max(3, Math.round((micLevels[idx] / 255) * 14));
                      return <span key={i} className="mic-viz-bar" style={{ height: `${h}px` }} />;
                    })}
                  </span>
                )}
                <span>{isVoiceMode ? 'Stop' : 'Voice'}</span>
              </button>
              <button 
                className={`sidebar-ctrl-btn ${audioEnabled ? 'active-ctrl' : ''}`}
                onClick={() => setAudioEnabled(!audioEnabled)}
              >
                <AudioLines size={14} />
                <span>Audio</span>
              </button>
              {audioEnabled && (
                <select 
                  className="sidebar-ctrl-select"
                  value={ttsProvider}
                  onChange={(e) => setTtsProvider(e.target.value as 'deepgram' | 'supertonic' | 'gemini-live')}
                  title="TTS Provider"
                >
                  <option value="deepgram">Deepgram</option>
                  <option value="supertonic">Supertonic</option>
                  <option value="gemini-live">Live</option>
                </select>
              )}
            </div>

            {/* Stop / Interrupt bar — only visible when agents are processing */}
            {isProcessing && (
              <button className="sidebar-halt-bar" onClick={handleInterrupt} title="Interrupt Agents">
                <X size={12} /> Stop Discussion
              </button>
            )}

            <div className="sidebar-input-box">
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={isProcessing ? 'Inject a message into the discussion...' : 'Type a message...'}
              />
              <div className="sidebar-input-footer">
                <div className="sidebar-input-icons">
                  <Plus size={14} className="sidebar-input-icon" />
                  <Paperclip size={14} className="sidebar-input-icon" />
                </div>
                <button 
                  className="sidebar-send-btn" 
                  onClick={() => handleSend()} 
                  disabled={!input.trim()}
                  title="Send"
                >
                  <ArrowUp size={14} />
                </button>
              </div>
            </div>
          </div>
        </aside>

        <div id="agent-grid">
          {agents.length === 0 ? (
            <div className="agent-grid-empty">
              All nodes offline. Initialize new agents in preferences.
            </div>
          ) : agents.map((a, i) => {
            const isActive = activeAgentName === a.name;
            const isSpeaking = speakingAgentName === a.name;
            
            return (
              <div key={a.id} className={`agent-card agent-dynamic-${a.id} ${isActive ? 'active' : ''} ${isSpeaking ? 'speaking' : ''}`}>
                <style>{`.agent-dynamic-${a.id} { --agent-color-rgb: ${a.rgba}; --agent-hex: ${a.hex}; --agent-bg: ${a.hex}; }`}</style>
                <button className="star-btn" onClick={() => rewardAgent(i)} title="Reward Idea">
                  <Star size={16} fill="currentColor" />
                </button>
                <button 
                  className="star-btn" 
                  style={{ right: '30px' }}
                  onClick={async () => {
                    try {
                      const testText = `Hello! This is ${a.name} testing audio playback.`;
                      setSpeakingAgentName(a.name);
                      await speakRealtimeGemini(
                        testText,
                        a.name,
                        a.voice,
                        () => {},
                        () => setSpeakingAgentName(null)
                      );
                    } catch (e) {
                      console.error('TTS Error:', e);
                      setSpeakingAgentName(null);
                    }
                  }} 
                  title="Test TTS Audio"
                >
                  <Volume2 size={16} />
                </button>
                <div className="card-top">
                  {typeof a.img === 'string' ? (
                    <img src={a.img || 'https://freepngimg.com/thumb/robot/2-2-robot-transparent.png'} className="agent-img" alt={a.name} />
                  ) : (
                    <div className="agent-avatar">{a.img}</div>
                  )}
                  {/* Audio visualiser ring (synced to TTS AnalyserNode) */}
                  {isSpeaking && (
                    <div className="agent-audio-viz">
                      {ttsBarHeights.map((h, bi) => (
                        <span key={bi} className="agent-audio-bar" style={{ height: `${h}px` }} />
                      ))}
                    </div>
                  )}
                </div>
                  <div className="card-bottom">
                       <div className="agent-name">
                         <div className="agent-name-content">
                           <span>{a.name}</span>
                         </div>
                       </div>
                    <div className="agent-status">{isSpeaking ? 'Speaking...' : isActive && audioEnabled ? 'Thinking...' : isActive ? 'Generating...' : 'Standby'}</div>
                    <div className="agent-model-label">
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

      {/* ─── History Panel ─────────────────────────────────────────────── */}
      {showHistoryPanel && (
        <div id="settings-modal" className="modal-open">
          <div className="modal-content modal-content-col">
            <div className="settings-header">
              <div>
                <h2>Conversation History</h2>
                <p>{savedDiscussions.length} saved discussion{savedDiscussions.length !== 1 ? 's' : ''}</p>
              </div>
              <button onClick={() => setShowHistoryPanel(false)} className="btn-icon" title="Close History" aria-label="Close History"><X /></button>
            </div>
            <div className="settings-body history-list">
              {savedDiscussions.length === 0 ? (
                <div className="memory-empty">
                  <Clock size={48} className="memory-empty-icon" />
                  <p>No conversations yet</p>
                  <p className="memory-empty-hint">Start a discussion and it will appear here.</p>
                </div>
              ) : (
                savedDiscussions.map((d) => (
                  <div
                    key={d.id}
                    className={`history-item ${currentDiscussionId === d.id ? 'current' : ''}`}
                    onClick={() => { loadDiscussion(d); setShowHistoryPanel(false); }}
                  >
                    <div className="history-item-row">
                      <span className="history-item-title">{d.title}</span>
                      <button
                        className="history-item-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete "${d.title}"?`)) deleteDiscussion(d.id);
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <span className="history-item-meta">
                      {new Date(d.timestamp).toLocaleDateString()} · {d.messageCount} msgs
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showMemoryBoard && (
        <div id="settings-modal" className="modal-open">
          <div className="modal-content modal-content-col">
            <div className="settings-header">
              <div>
                <h2>Shared Memory Board</h2>
                <p>Facts, assumptions, conflicts, decisions, and open questions.</p>
              </div>
              <button onClick={() => setShowMemoryBoard(false)} className="btn-icon" title="Close Memory Board" aria-label="Close Memory Board"><X /></button>
            </div>
            <div className="settings-body markdown-body">
              {memoryBoardContent ? (
                <ReactMarkdown>{memoryBoardContent}</ReactMarkdown>
              ) : (
              <div className="memory-empty">
                  <AudioLines size={48} className="memory-empty-icon" />
                  <p>The memory board is empty.</p>
                  <p className="memory-empty-hint">It will be populated at the end of the panel discussion.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div id="settings-modal" className="modal-open">
          <div className="modal-content modal-content-open">
            <div className="settings-sidebar">
              <div className="settings-sidebar-header">System</div>
              <div className="sidebar-scroll">
                <div className={`agent-tab ${activeEditIndex === -1 ? 'active' : ''}`} onClick={() => setActiveEditIndex(-1)}>
                  <div className="tab-color-dot tab-color-dot-system"></div>
                  System Prompt
                </div>
                <div className={`agent-tab agent-tab-server ${activeEditIndex === -2 ? 'active' : ''}`} onClick={() => setActiveEditIndex(-2)}>
                  <Server size={14} className="input-flex" />
                  Server Config
                </div>
                <div className="settings-sidebar-header sidebar-section-header">Neural Nodes</div>
                {agents.map((a, i) => (
                  <div key={a.id} className={`agent-tab agent-dynamic-${a.id} ${i === activeEditIndex ? 'active' : ''}`} onClick={() => setActiveEditIndex(i)}>
                    <div className="tab-color-dot"></div>
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
                <div className="settings-header-actions">
                  {activeEditIndex === -2 && (
                    <button
                      onClick={saveCurrentSettings}
                      disabled={isSavingSettings}
                      className={`btn-save-settings custom-input ${settingsSaved ? 'saved' : ''}`}
                    >
                      {isSavingSettings ? 'Saving...' : settingsSaved ? '✅ Saved' : '💾 Save Settings'}
                    </button>
                  )}
                  <button onClick={() => setShowSettings(false)} className="btn-icon" title="Close Settings" aria-label="Close Settings"><X /></button>
                </div>
              </div>

              {activeEditIndex === -2 ? (
                <>
                  <div className="form-grid">
                    <div className="form-group full">
                      <label>Ollama Server URL</label>
                      <div className="row-flex">
                        <input type="text" className="custom-input input-flex" value={ollamaUrl} onChange={(e) => setOllamaUrl(e.target.value)} placeholder="http://localhost:11434" />
                        <button
                          className="custom-input btn-action"
                          onClick={() => refreshOllamaModels(ollamaUrl)}
                        >
                          Test &amp; Refresh
                        </button>
                      </div>
                    </div>

                    <div className="form-group full">
                      <div className="row-flex-center">
                        <div className={`status-dot ${ollamaStatus}`}></div>
                        <span className="status-text">
                          {ollamaStatus === 'connected' ? `Connected — ${ollamaModels.length} model${ollamaModels.length !== 1 ? 's' : ''} available` : ollamaStatus === 'checking' ? 'Checking...' : 'Not connected'}
                        </span>
                      </div>
                    </div>

                    <div className="form-group full">
                      <label>Default Ollama Model</label>
                      <select className="custom-input" title="Default Ollama Model" aria-label="Default Ollama Model" value={ollamaDefaultModel} onChange={(e) => setOllamaDefaultModel(e.target.value)}>
                        {ollamaModels.length > 0 ? ollamaModels.map(m => (
                          <option key={m} value={m}>{m}</option>
                        )) : (
                          <option value={ollamaDefaultModel}>{ollamaDefaultModel}</option>
                        )}
                      </select>
                    </div>

                    <div className="form-group full">
                      <label>Available Models</label>
                      <div className="row-flex-wrap">
                        {ollamaModels.length > 0 ? ollamaModels.map(m => (
                          <span key={m} className="badge-pill">{m}</span>
                        )) : (
                          <span className="badge-muted">Click "Test &amp; Refresh" to load models from Ollama</span>
                        )}
                      </div>
                    </div>

                    <div className="info-box-content">
                      <p className="info-box-p">
                        <strong>Note:</strong> The Manager agent's Model Provider setting determines the engine for the entire panel discussion. If you encounter CORS errors, restart Ollama with:<br />
                        <code className="code-pill">OLLAMA_ORIGINS=* ollama serve</code>
                      </p>
                    </div>

                    <div className="form-group full info-box">
                      <label>Device ID (Anonymous User)</label>
                      <div className="row-flex-center">
                        <input
                          type="text"
                          className="custom-input input-mono"
                          value={getDeviceId()}
                          readOnly
                          title="Your unique device identifier for saving settings"
                        />
                        <button
                          className="custom-input btn-action"
                          onClick={() => {
                            navigator.clipboard.writeText(getDeviceId());
                            alert('Device ID copied to clipboard!');
                          }}
                          title="Copy device ID to clipboard"
                        >
                          📋 Copy
                        </button>
                      </div>
                      <div className="info-box-sm">
                        <p>Your settings are saved anonymously using this device identifier. Each device has its own unique settings.</p>
                      </div>
                    </div>
                  </div>

                  {/* Docker Backend Section */}
                  <div className="form-group full">
                    <label>Docker Backend (Multi-Agent System)</label>
                    <div className="row-flex-center" style={{ marginTop: '8px' }}>
                      <button
                        className={`toggle-btn ${useDockerBackend ? 'active' : ''}`}
                        onClick={() => setUseDockerBackend(!useDockerBackend)}
                        disabled={dockerStatus === 'disconnected'}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: dockerStatus === 'disconnected' ? 'not-allowed' : 'pointer',
                          background: useDockerBackend ? '#10b981' : '#374151',
                          color: 'white',
                          fontWeight: 500,
                          opacity: dockerStatus === 'disconnected' ? 0.5 : 1
                        }}
                      >
                        {useDockerBackend ? '✓ Enabled' : '○ Disabled'}
                      </button>
                      <div className="row-flex-center" style={{ marginLeft: '12px' }}>
                        {dockerStatus === 'connected' ? <Wifi size={16} color="#10b981" /> : dockerStatus === 'checking' ? <Wifi size={16} color="#eab308" /> : <WifiOff size={16} color="#ef4444" />}
                        <span className="status-text" style={{ marginLeft: '6px', fontSize: '12px' }}>
                          {dockerStatus === 'connected' ? 'Orchestrator & Meeting-Bus connected' : dockerStatus === 'checking' ? 'Checking...' : 'Not available'}
                        </span>
                      </div>
                    </div>
                    <div className="info-box-sm" style={{ marginTop: '8px' }}>
                      <p>Use the Docker multi-agent system for distributed AI agents. When enabled, sessions are managed by the orchestrator and agents communicate via the meeting-bus.</p>
                    </div>
                    {currentSession && (
                      <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '4px' }}>
                        <span style={{ fontSize: '12px', color: '#10b981' }}>Active Session: {currentSession.session_id.slice(0, 8)}...</span>
                      </div>
                    )}
                  </div>

                  {/* TTS Settings */}
                  <div className="form-group full" style={{ marginTop: '24px' }}>
                    <label>Text-to-Speech (TTS)</label>
                    
                    <div style={{ marginTop: '12px' }}>
                      <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>TTS Provider</label>
                      <select 
                        className="custom-input" 
                        value={ttsProvider}
                        onChange={(e) => setTtsProvider(e.target.value as 'deepgram' | 'supertonic' | 'gemini-live')}
                        style={{ width: '100%' }}
                      >
                        <option value="deepgram">Deepgram (High quality, cloud)</option>
                        <option value="supertonic">Supertonic (On-device, fast)</option>
                        <option value="gemini-live">Gemini Live (Realtime, ultra-low latency)</option>
                      </select>
                    </div>

                    <div className="info-box-sm" style={{ marginTop: '8px' }}>
                      <p>
                        <strong>Deepgram</strong> - High quality cloud TTS with sentence streaming<br />
                        <strong>Supertonic</strong> - On-device CPU TTS, no API costs<br />
                        <strong>Gemini Live</strong> - Ultra-low latency via WebSocket, requires Gemini API
                      </p>
                    </div>
                  </div>

                  {/* Voice Settings */}
                  <div className="form-group full" style={{ marginTop: '16px' }}>
                    <label>Agent Voices</label>
                    <div className="form-grid" style={{ marginTop: '8px', gap: '8px' }}>
                      {agents.map((agent) => (
                        <div key={agent.id} className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{agent.name}</label>
                          <select 
                            className="custom-input" 
                            value={agent.voice || ''}
                            onChange={(e) => {
                              const updated = [...agents];
                              updated[agents.findIndex(a => a.id === agent.id)] = { ...agent, voice: e.target.value };
                              setAgents(updated);
                            }}
                            style={{ width: '100%', fontSize: '12px' }}
                          >
                            {ttsProvider === 'gemini-live' ? (
                              <>
                                <option value="">Default</option>
                                <option value="Charon">Charon (Male, deep)</option>
                                <option value="Orion">Orion (Male, warm)</option>
                                <option value="Puck">Puck (Male, casual)</option>
                                <option value="Orus">Orus (Male, strong)</option>
                                <option value="Aoede">Aoede (Female, bright)</option>
                                <option value="Luna">Luna (Female, soft)</option>
                                <option value="Fenrir">Fenrir (Female, firm)</option>
                              </>
                            ) : (
                              <>
                                <option value="">Default</option>
                                <option value="F1">F1 (Female)</option>
                                <option value="F2">F2 (Female)</option>
                                <option value="M1">M1 (Male)</option>
                                <option value="M2">M2 (Male)</option>
                              </>
                            )}
                          </select>
                        </div>
                      ))}
                    </div>
                    <div className="info-box-sm" style={{ marginTop: '8px' }}>
                      <p>Assign unique voices to each agent for more immersive panel discussions.</p>
                    </div>
                  </div>
                </>
              ) : activeEditIndex === -1 ? (


                <div className="form-grid">
                  <div className="form-group full">
                    <label>Master System Prompt</label>
                    <textarea
                      className="custom-input textarea-system-prompt"
                      title="Master System Prompt"
                      aria-label="Master System Prompt"
                      placeholder="Enter the master orchestration prompt..."
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
                      <input type="text" className="custom-input" title="Display Name" aria-label="Display Name" placeholder="Agent display name" value={agents[activeEditIndex].name} onChange={(e) => {
                        const newAgents = [...agents];
                        newAgents[activeEditIndex].name = e.target.value;
                        setAgents(newAgents);
                      }} />
                    </div>

                    <div className="form-group">
                      <label>Role</label>
                      <input type="text" className="custom-input" title="Agent Role" aria-label="Agent Role" placeholder="e.g. Product Strategist" value={agents[activeEditIndex].role} onChange={(e) => {
                        const newAgents = [...agents];
                        newAgents[activeEditIndex].role = e.target.value;
                        setAgents(newAgents);
                      }} />
                    </div>



                    <div className="form-group">
                      <label>Color Hex</label>
                      <input type="text" className="custom-input" title="Color Hex" aria-label="Color Hex" placeholder="#3b82f6" value={agents[activeEditIndex].hex} onChange={(e) => {
                        const newAgents = [...agents];
                        newAgents[activeEditIndex].hex = e.target.value;
                        newAgents[activeEditIndex].rgba = hexToRgb(e.target.value);
                        setAgents(newAgents);
                      }} />
                    </div>

                    <div className="form-group">
                      <label>Model Provider</label>
                      <select className="custom-input" title="Model Provider" aria-label="Model Provider" value={agents[activeEditIndex].provider} onChange={(e) => {
                        const newAgents = [...agents];
                        newAgents[activeEditIndex].provider = e.target.value as 'local' | 'cloud';
                        newAgents[activeEditIndex].modelName = '';
                        setAgents(newAgents);
                      }}>

                        <option value="local">🖥️ Local (Ollama)</option>
                        <option value="cloud">☁️ Cloud (Gemini)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Model</label>
                      <select className="custom-input" title="Model" aria-label="Model" value={agents[activeEditIndex].modelName} onChange={(e) => {
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
                      <textarea className="custom-input" title="System Prompt" aria-label="System Prompt" placeholder="Enter agent directives and personality instructions..." value={agents[activeEditIndex].prompt} onChange={(e) => {
                        const newAgents = [...agents];
                        newAgents[activeEditIndex].prompt = e.target.value;
                        setAgents(newAgents);
                      }} />
                    </div>

                    <div className="form-group">
                      <label>Agent Avatar</label>
                      <div className="file-upload-zone" onClick={() => document.getElementById('avatar-upload')?.click()}>
                        <ImageIcon size={24} className="upload-icon" />
                        <p className="upload-hint">Click to upload image</p>
                        <input
                          type="file"
                          id="avatar-upload"
                          title="Upload Agent Avatar"
                          aria-label="Upload Agent Avatar"
                          className="input-hidden"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                const newAgents = [...agents];
                                newAgents[activeEditIndex].img = <img src={reader.result as string} alt={agents[activeEditIndex].name} className="avatar-img" />;
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
