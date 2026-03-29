// Supertonic TTS client - streaming playback with chunked audio decoding

const SUPERTONIC_URL = process.env.NEXT_PUBLIC_SUPERTONIC_URL || 'http://localhost:8004';

export const SUPERTONIC_VOICES: Record<string, string> = {
  'Nexus': 'M1',
  'Atlas': 'M1',
  'Echo': 'M2',
  'Veda': 'F1',
  'Nova': 'F2',
  'Cipher': 'F2',
};

const DEFAULT_VOICE = 'F1';

let sharedAudioCtx: AudioContext | null = null;
let ttsAnalyser: AnalyserNode | null = null;
let wordRevealTimer: ReturnType<typeof setInterval> | null = null;
let currentSourceNode: AudioBufferSourceNode | null = null;
let activeStreamingSession: StreamingTTSSession | null = null;

function ensureAudioCtx(): AudioContext {
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new AudioContext();
  }
  return sharedAudioCtx;
}

export function unlockAudio(): void {
  try {
    const ctx = ensureAudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
  } catch (e) {
    console.warn('unlockAudio failed:', e);
  }
}

export function getTTSAnalyser(): AnalyserNode | null {
  return ttsAnalyser;
}

export function stopAllAudio(): void {
  if (currentSourceNode) {
    try {
      currentSourceNode.stop();
    } catch (e) {}
    currentSourceNode = null;
  }
  if (wordRevealTimer) {
    clearInterval(wordRevealTimer);
    wordRevealTimer = null;
  }
  ttsAnalyser = null;
}

export interface SpeakOptions {
  signal?: AbortSignal;
  onPlayStart?: () => void;
  onTextProgress?: (text: string) => void;
  voice?: string;
}

interface QueuedSentence {
  sentence: string;
  audioPromise: Promise<AudioBuffer | null>;
}

interface StreamingTTSSession {
  feedChunk(chunk: string): void;
  finish(): void;
  done: Promise<void>;
  getFullText(): string;
  abort(): void;
}

function detectSentenceBoundary(buffer: string): { sentence: string; remainder: string } | null {
  const MIN_SENTENCE_LENGTH = 10;
  const CLAUSE_SPLIT_THRESHOLD = 80;

  for (let i = MIN_SENTENCE_LENGTH; i < buffer.length; i++) {
    const ch = buffer[i];
    if ((ch === '.' || ch === '!' || ch === '?') && (i + 1 >= buffer.length || buffer[i + 1] === ' ' || buffer[i + 1] === '\n')) {
      const before = buffer.substring(Math.max(0, i - 3), i);
      if (before.includes('.') && before.length <= 3) continue;
      
      const sentence = buffer.substring(0, i + 1).trim();
      const remainder = buffer.substring(i + 1).trimStart();
      if (sentence.length >= MIN_SENTENCE_LENGTH) {
        return { sentence, remainder };
      }
    }
  }

  if (buffer.length >= CLAUSE_SPLIT_THRESHOLD) {
    let bestSplit = -1;
    for (let i = Math.floor(CLAUSE_SPLIT_THRESHOLD * 0.5); i < buffer.length; i++) {
      const ch = buffer[i];
      if ((ch === ',' || ch === ';' || ch === ':') && i + 1 < buffer.length && buffer[i + 1] === ' ') {
        bestSplit = i;
      }
      if (ch === '—' && i + 1 < buffer.length && buffer[i + 1] === ' ') {
        bestSplit = i;
      }
      if (ch === '-' && i > 0 && buffer[i - 1] === ' ' && i + 1 < buffer.length && buffer[i + 1] === ' ') {
        bestSplit = i;
      }
    }
    if (bestSplit > 10) {
      const sentence = buffer.substring(0, bestSplit).trim();
      const remainder = buffer.substring(bestSplit).trimStart();
      return { sentence, remainder };
    }
  }

  return null;
}

async function synthesizeSentence(text: string, voice: string, signal?: AbortSignal): Promise<AudioBuffer | null> {
  try {
    const controller = new AbortController();
    const timeout = signal ? signal : controller.signal;
    
    const response = await fetch(`${SUPERTONIC_URL}/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        voice,
        lang: 'en',
        speed: 1.05,
        quality: 5
      }),
      signal: timeout as AbortSignal
    });

    if (!response.ok) {
      console.error('Supertonic synthesis failed:', response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const audioBase64 = data.audio;
    
    const binaryString = atob(audioBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const ctx = ensureAudioCtx();
    const audioBuffer = await ctx.decodeAudioData(bytes.buffer);
    return audioBuffer;
  } catch (e) {
    if ((e as Error).name === 'AbortError') return null;
    console.error('Supertonic TTS error:', e);
    return null;
  }
}

function waitForQueue(): Promise<void> {
  return new Promise((resolve) => {
    queueResolve = resolve;
  });
}

let queueResolve: (() => void) | null = null;

export function createStreamingTTS(
  agentName: string,
  opts: SpeakOptions = {}
): StreamingTTSSession {
  const { signal, onPlayStart, onTextProgress, voice: customVoice } = opts;
  const voice = customVoice || SUPERTONIC_VOICES[agentName] || DEFAULT_VOICE;

  const sessionAbort = new AbortController();
  const combinedSignal = signal
    ? (() => {
        if (signal.aborted) { sessionAbort.abort(); return sessionAbort.signal; }
        signal.addEventListener('abort', () => sessionAbort.abort(), { once: true });
        return sessionAbort.signal;
      })()
    : sessionAbort.signal;

  let rawBuffer = '';
  let fullText = '';
  let revealedText = '';
  let playStarted = false;
  let finished = false;
  let aborted = false;

  const queue: QueuedSentence[] = [];

  function enqueueSentence(sentence: string) {
    const audioPromise = synthesizeSentence(sentence, voice, combinedSignal);
    queue.push({ sentence, audioPromise });
    if (queueResolve) {
      queueResolve();
      queueResolve = null;
    }
  }

  async function revealWords(sentence: string, durationSecs?: number): Promise<void> {
    return new Promise((resolve) => {
      const words = sentence.split(/(\s+)/);
      const totalTokens = words.length;

      if (!durationSecs || !isFinite(durationSecs) || totalTokens <= 1) {
        revealedText += sentence;
        onTextProgress?.(revealedText);
        resolve();
        return;
      }

      const intervalMs = Math.max(30, (durationSecs * 1000) / (totalTokens * 0.55));
      let revealed = 0;

      wordRevealTimer = setInterval(() => {
        if (aborted) {
          if (wordRevealTimer !== null) { clearInterval(wordRevealTimer); wordRevealTimer = null; }
          resolve();
          return;
        }
        revealed += 1;
        if (revealed >= totalTokens) {
          revealedText += sentence;
          onTextProgress?.(revealedText);
          if (wordRevealTimer !== null) { clearInterval(wordRevealTimer); wordRevealTimer = null; }
          resolve();
        } else {
          onTextProgress?.(revealedText + words.slice(0, revealed).join(''));
        }
      }, intervalMs);
    });
  }

  const donePromise = (async () => {
    stopAllAudio();
    activeStreamingSession = session;

    let sentenceIndex = 0;

    while (true) {
      if (aborted) break;
      await waitForQueue();
      if (aborted) break;
      if (queue.length === 0 && finished) break;
      if (queue.length === 0) continue;

      const item = queue.shift()!;
      sentenceIndex++;

      const audioBuffer = await item.audioPromise;
      if (aborted) break;

      if (!audioBuffer) {
        revealedText += (revealedText && !revealedText.endsWith(' ') ? ' ' : '') + item.sentence;
        onTextProgress?.(revealedText);
        continue;
      }

      if (!playStarted) {
        playStarted = true;
        onPlayStart?.();
      }

      const ctx = ensureAudioCtx();
      if (ctx.state === 'suspended') await ctx.resume();

      ttsAnalyser = ctx.createAnalyser();
      ttsAnalyser.fftSize = 64;
      ttsAnalyser.smoothingTimeConstant = 0.7;

      const sourceNode = ctx.createBufferSource();
      sourceNode.buffer = audioBuffer;
      sourceNode.connect(ttsAnalyser);
      ttsAnalyser.connect(ctx.destination);
      currentSourceNode = sourceNode;

      const spacer = revealedText && !revealedText.endsWith(' ') ? ' ' : '';
      const sentenceWithSpacer = spacer + item.sentence;

      const durationSecs = audioBuffer.duration;

      await new Promise<void>((resolve) => {
        sourceNode.onended = async () => {
          if (aborted) { resolve(); return; }
          await revealWords(item.sentence, durationSecs);
          resolve();
        };
        try {
          sourceNode.start(0);
        } catch (e) {
          resolve();
        }
      });

      if (aborted) break;
    }

    if (onTextProgress && !aborted) {
      onTextProgress(fullText);
    }
    if (!playStarted) {
      onPlayStart?.();
    }
    ttsAnalyser = null;
    if (activeStreamingSession === session) {
      activeStreamingSession = null;
    }
  })();

  const session: StreamingTTSSession = {
    feedChunk(chunk: string) {
      if (finished || aborted) return;
      rawBuffer += chunk;
      fullText += chunk;

      let boundary: ReturnType<typeof detectSentenceBoundary>;
      while ((boundary = detectSentenceBoundary(rawBuffer)) !== null) {
        enqueueSentence(boundary.sentence);
        rawBuffer = boundary.remainder;
      }
    },

    finish() {
      if (finished) return;
      finished = true;
      const remaining = rawBuffer.trim();
      if (remaining) {
        enqueueSentence(remaining);
        rawBuffer = '';
      }
      if (queueResolve) {
        queueResolve();
        queueResolve = null;
      }
    },

    done: donePromise,

    getFullText() {
      return fullText;
    },

    abort() {
      aborted = true;
      finished = true;
      sessionAbort.abort();
      if (wordRevealTimer) {
        clearInterval(wordRevealTimer);
        wordRevealTimer = null;
      }
      if (queueResolve) {
        queueResolve();
        queueResolve = null;
      }
    }
  };

  return session;
}
