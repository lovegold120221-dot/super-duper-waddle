// Gemini Live TTS - WebSocket-based realtime speech

const GEMINI_LIVE_URL = process.env.NEXT_PUBLIC_GEMINI_LIVE_URL || 'ws://localhost:8005';

export const AGENT_VOICES: Record<string, string> = {
  'Nexus': 'Charon',
  'Atlas': 'Orion', 
  'Echo': 'Puck',
  'Veda': 'Aoede',
  'Nova': 'Luna',
  'Cipher': 'Fenrir',
  'Orus': 'Orus',
};

let websocket: WebSocket | null = null;
let audioContext: AudioContext | null = null;
let isConnected = false;
let currentVoice: string = 'Charon';

function ensureAudioContext(): AudioContext {
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new AudioContext();
  }
  return audioContext;
}

export function unlockAudio(): void {
  try {
    const ctx = ensureAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
  } catch (e) {
    console.warn('unlockAudio failed:', e);
  }
}

export async function connect(voice?: string): Promise<boolean> {
  if (websocket && isConnected && (!voice || voice === currentVoice)) return true;
  
  if (websocket) {
    websocket.close();
    websocket = null;
    isConnected = false;
  }

  currentVoice = voice || 'Charon';

  return new Promise((resolve) => {
    websocket = new WebSocket(`${GEMINI_LIVE_URL}/ws/${encodeURIComponent(currentVoice)}`);

    websocket.onopen = () => {
      isConnected = true;
      resolve(true);
    };

    websocket.onerror = (error) => {
      console.error('Gemini Live WebSocket error:', error);
      resolve(false);
    };

    websocket.onclose = () => {
      isConnected = false;
      websocket = null;
    };
  });
}

export function disconnect(): void {
  if (websocket) {
    websocket.send(JSON.stringify({ type: 'end' }));
    websocket.close();
    websocket = null;
    isConnected = false;
  }
}

export function isWebSocketConnected(): boolean {
  return isConnected && websocket !== null;
}

export async function speak(
  text: string,
  onAudioChunk?: (audioData: ArrayBuffer) => void,
  onText?: (text: string) => void,
  onEnd?: () => void
): Promise<void> {
  if (!websocket || !isConnected) {
    const connected = await connect();
    if (!connected) {
      console.error('Failed to connect to Gemini Live');
      return;
    }
  }

  const ctx = ensureAudioContext();
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  return new Promise((resolve) => {
    if (!websocket) {
      resolve();
      return;
    }

    let pendingSources: AudioBufferSourceNode[] = [];
    let lastChunkTime = Date.now();
    let playbackComplete = false;

    const checkPlaybackComplete = () => {
      if (playbackComplete) return;
      const now = Date.now();
      if (now - lastChunkTime > 500) {
        playbackComplete = true;
        if (onEnd) onEnd();
        resolve();
      }
    };

    websocket.onmessage = async (event) => {
      console.log('[GeminiLive] Received message type:', typeof event.data, event.data instanceof ArrayBuffer ? `ArrayBuffer(${event.data.byteLength})` : event.data);
      if (event.data instanceof ArrayBuffer) {
        lastChunkTime = Date.now();
        console.log('[GeminiLive] Audio chunk received:', event.data.byteLength, 'bytes');
        
        if (onAudioChunk) {
          onAudioChunk(event.data);
        } else {
          try {
            const audioData = await ctx.decodeAudioData(event.data);
            const source = ctx.createBufferSource();
            source.buffer = audioData;
            source.connect(ctx.destination);
            source.start(0);
            pendingSources.push(source);
            source.onended = () => {
              pendingSources = pendingSources.filter(s => s !== source);
              checkPlaybackComplete();
            };
          } catch (e) {
            // Fallback: play raw PCM
            const PCM_HZ = 16000;
            const pcm = new Int16Array(event.data);
            const float32 = new Float32Array(pcm.length);
            for (let i = 0; i < pcm.length; i++) {
              float32[i] = pcm[i] / 32768;
            }
            const buffer = ctx.createBuffer(1, float32.length, PCM_HZ);
            buffer.getChannelData(0).set(float32);
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.start(0);
            pendingSources.push(source);
            source.onended = () => {
              pendingSources = pendingSources.filter(s => s !== source);
              checkPlaybackComplete();
            };
          }
        }
      } else if (typeof event.data === 'string') {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'text' && onText) {
            onText(data.text);
          } else if (data.type === 'error') {
            console.error('Gemini Live error:', data.error);
            resolve();
          } else if (data.type === 'done' || data.type === 'end') {
            setTimeout(checkPlaybackComplete, 1000);
          }
        } catch (e) {}
      }
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error during speech:', error);
      resolve();
    };

    websocket.onclose = () => {
      isConnected = false;
      setTimeout(checkPlaybackComplete, 500);
    };

    // Send the text
    websocket.send(JSON.stringify({
      type: 'text',
      text: text,
      end_of_turn: true
    }));

    // Fallback timeout after 30 seconds
    setTimeout(() => {
      if (!playbackComplete) {
        playbackComplete = true;
        if (onEnd) onEnd();
        resolve();
      }
    }, 30000);
  });
}

export function stopSpeaking(): void {
  if (websocket && isConnected) {
    websocket.send(JSON.stringify({ type: 'end' }));
  }
}

export async function speakRealtime(
  text: string,
  agentName: string,
  customVoice?: string,
  onStart?: () => void,
  onEnd?: () => void
): Promise<() => void> {
  unlockAudio();
  
  const voice = customVoice || AGENT_VOICES[agentName] || 'Charon';
  console.log('[GeminiLive] Connecting with voice:', voice);
  await connect(voice);
  console.log('[GeminiLive] Connected, isWebSocketConnected:', isWebSocketConnected());
  
  if (onStart) onStart();
  
  console.log('[GeminiLive] Speaking:', text);
  await speak(
    text,
    undefined,
    undefined,
    () => {
      console.log('[GeminiLive] Playback ended');
      if (onEnd) onEnd();
    }
  );
  console.log('[GeminiLive] speak() returned');
  
  return () => {};
}
