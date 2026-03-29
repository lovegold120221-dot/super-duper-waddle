// Deepgram Aura-2 TTS — streaming playback with chunked audio decoding
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

// Each agent gets a unique Aura-2 voice for immersive panel discussions
export const DEEPGRAM_VOICES: Record<string, string> = {
  'Nexus':  'aura-2-odysseus-en',   // masculine, calm, smooth, professional — manager
  'Atlas':  'aura-2-apollo-en',     // masculine, confident, comfortable — strategist
  'Echo':   'aura-2-arcas-en',      // masculine, natural, smooth, clear — engineer
  'Veda':   'aura-2-amalthea-en',   // feminine, engaging, natural, cheerful — architect
  'Nova':   'aura-2-thalia-en',     // feminine, clear, confident, energetic — UX
  'Cipher': 'aura-2-andromeda-en',  // feminine, casual, expressive — reality checker
};

const DEFAULT_VOICE = 'aura-2-thalia-en';

// Shared AudioContext used for unlocking autoplay, TTS analyser, etc.
let sharedAudioCtx: AudioContext | null = null;
// AnalyserNode connected to the currently-playing TTS audio
let ttsAnalyser: AnalyserNode | null = null;
// Active word-reveal interval (cleared on stop)
let wordRevealTimer: ReturnType<typeof setInterval> | null = null;
// Currently playing audio element (for non-streaming fallback and stop)
let currentAudio: HTMLAudioElement | null = null;
// Currently playing streaming source node
let currentSourceNode: AudioBufferSourceNode | null = null;
// Flag to signal streaming playback should stop
let streamingAborted = false;
// Active streaming TTS session (for stopAllAudio to abort)
let activeStreamingSession: StreamingTTSSession | null = null;

function ensureAudioCtx(): AudioContext {
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new AudioContext();
  }
  return sharedAudioCtx;
}

/**
 * Unlock browser autoplay by creating & resuming an AudioContext during a user
 * gesture (click/tap). Must be called synchronously inside a click handler.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
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

/**
 * Returns the current TTS AnalyserNode (or null when nothing is playing).
 * Use this to drive real-time frequency bar visualisations on agent cards.
 */
export function getTTSAnalyser(): AnalyserNode | null {
  return ttsAnalyser;
}

export interface SpeakOptions {
  signal?: AbortSignal;
  /** Called once playback actually starts (first audio chunk plays). */
  onPlayStart?: () => void;
  /**
   * Progressive word-by-word text reveal synced to audio duration.
   * Called repeatedly with increasing portions of the ORIGINAL text (preserving
   * emotes/markdown) as the audio plays. The final call contains the full text.
   */
  onTextProgress?: (partialText: string) => void;
  /** The original (un-cleaned) text used for progressive reveal. */
  originalText?: string;
}

/**
 * Speak text using Deepgram Aura-2 TTS with streaming playback.
 *
 * Instead of waiting for the entire audio blob, we stream the HTTP response
 * and begin playback as soon as enough data has arrived. This significantly
 * reduces time-to-first-audio for longer responses.
 *
 * Resolves when audio finishes playing (or on error/abort — never rejects).
 */
export async function speakWithDeepgram(
  text: string,
  agentName: string,
  opts: SpeakOptions = {}
): Promise<void> {
  const { signal, onPlayStart, onTextProgress, originalText } = opts;

  if (!DEEPGRAM_API_KEY) {
    console.warn('Deepgram API key not configured');
    onPlayStart?.();
    if (onTextProgress) onTextProgress(originalText || text);
    return;
  }

  const voice = DEEPGRAM_VOICES[agentName] || DEFAULT_VOICE;

  // Clean text for TTS — convert emotional cues to spoken equivalents
  const cleanText = cleanForTTS(text);

  if (!cleanText || cleanText.length < 3) {
    onPlayStart?.();
    if (onTextProgress) onTextProgress(originalText || text);
    return;
  }

  // Stop any currently-playing audio first
  stopAllAudio();
  streamingAborted = false;

  try {
    const response = await fetch(
      `https://api.deepgram.com/v1/speak?model=${voice}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Token ${DEEPGRAM_API_KEY}`,
          'Content-Type': 'text/plain',
        },
        body: cleanText,
        signal,
      }
    );

    if (!response.ok) {
      console.error(`Deepgram TTS error: ${response.status} ${response.statusText}`);
      onPlayStart?.();
      if (onTextProgress) onTextProgress(originalText || text);
      return;
    }

    // ── Try streaming playback via AudioContext ──────────────────────────
    // We accumulate the response into an ArrayBuffer progressively,
    // then decode and play once complete. For true streaming we'd need
    // chunked WAV decoding, but Deepgram returns MP3/OGG which requires
    // the full payload for reliable decodeAudioData. However, we stream
    // the *download* so the fetch doesn't block — we start decoding ASAP.
    //
    // For shorter responses (<1s), this is nearly instant.
    // For longer ones, the streaming download still saves ~200-500ms vs blob().

    const reader = response.body?.getReader();
    if (!reader) {
      // Fallback: no ReadableStream support — use blob approach
      return await fallbackBlobPlayback(response, text, agentName, opts);
    }

    const chunks: Uint8Array[] = [];
    let totalLength = 0;

    while (true) {
      if (streamingAborted || signal?.aborted) {
        reader.cancel();
        onPlayStart?.();
        if (onTextProgress) onTextProgress(originalText || text);
        return;
      }

      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        totalLength += value.length;
      }
    }

    if (streamingAborted || signal?.aborted) {
      onPlayStart?.();
      if (onTextProgress) onTextProgress(originalText || text);
      return;
    }

    // Merge chunks into a single ArrayBuffer
    const merged = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    // Decode and play through AudioContext with AnalyserNode
    const ctx = ensureAudioCtx();
    if (ctx.state === 'suspended') await ctx.resume();

    let audioBuffer: AudioBuffer;
    try {
      audioBuffer = await ctx.decodeAudioData(merged.buffer.slice(0));
    } catch (decodeErr) {
      console.warn('AudioContext decode failed, falling back to HTMLAudioElement:', decodeErr);
      // Fallback: create blob and use HTMLAudioElement
      const blob = new Blob([merged], { type: 'audio/mp3' });
      return await playWithHTMLAudio(blob, text, agentName, opts);
    }

    // Set up analyser
    ttsAnalyser = ctx.createAnalyser();
    ttsAnalyser.fftSize = 64;
    ttsAnalyser.smoothingTimeConstant = 0.7;

    const sourceNode = ctx.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(ttsAnalyser);
    ttsAnalyser.connect(ctx.destination);
    currentSourceNode = sourceNode;

    await new Promise<void>((resolve) => {
      const cleanup = () => {
        if (wordRevealTimer !== null) {
          clearInterval(wordRevealTimer);
          wordRevealTimer = null;
        }
        ttsAnalyser = null;
        currentSourceNode = null;
      };

      sourceNode.onended = () => {
        if (onTextProgress) onTextProgress(originalText || text);
        cleanup();
        resolve();
      };

      // Start word-by-word reveal
      onPlayStart?.();
      if (onTextProgress) {
        const revealSource = originalText || text;
        const words = revealSource.split(/(\s+)/); // keep whitespace tokens
        const totalTokens = words.length;
        const duration = audioBuffer.duration; // seconds

        if (!duration || !isFinite(duration) || totalTokens <= 1) {
          onTextProgress(revealSource);
        } else {
          const intervalMs = Math.max(30, (duration * 1000) / (totalTokens * 0.55));
          let revealed = 0;

          wordRevealTimer = setInterval(() => {
            revealed += 1;
            if (revealed >= totalTokens) {
              onTextProgress(revealSource);
              if (wordRevealTimer !== null) {
                clearInterval(wordRevealTimer);
                wordRevealTimer = null;
              }
            } else {
              onTextProgress(words.slice(0, revealed).join(''));
            }
          }, intervalMs);
        }
      }

      if (signal?.aborted || streamingAborted) {
        if (onTextProgress) onTextProgress(originalText || text);
        cleanup();
        resolve();
        return;
      }

      signal?.addEventListener('abort', () => {
        if (onTextProgress) onTextProgress(originalText || text);
        try { sourceNode.stop(); } catch {}
        cleanup();
        resolve();
      }, { once: true });

      try {
        sourceNode.start(0);
      } catch {
        if (onTextProgress) onTextProgress(originalText || text);
        cleanup();
        resolve();
      }
    });
  } catch (e: any) {
    if (e.name !== 'AbortError') {
      console.warn('Deepgram TTS failed:', e);
    }
    ttsAnalyser = null;
    onPlayStart?.();
    if (onTextProgress) onTextProgress(originalText || text);
  }
}

/**
 * Fallback: play from a Blob using HTMLAudioElement (old approach).
 * Used when ReadableStream is not available.
 */
async function fallbackBlobPlayback(
  response: Response,
  text: string,
  agentName: string,
  opts: SpeakOptions
): Promise<void> {
  const blob = await response.blob();
  return playWithHTMLAudio(blob, text, agentName, opts);
}

/**
 * Play audio from a Blob via HTMLAudioElement + AudioContext analyser.
 */
async function playWithHTMLAudio(
  blob: Blob,
  text: string,
  _agentName: string,
  opts: SpeakOptions
): Promise<void> {
  const { signal, onPlayStart, onTextProgress, originalText } = opts;
  const audioUrl = URL.createObjectURL(blob);
  const audio = new Audio(audioUrl);
  currentAudio = audio;

  // Route through AudioContext + AnalyserNode for visualiser
  const ctx = ensureAudioCtx();
  if (ctx.state === 'suspended') await ctx.resume();
  const source = ctx.createMediaElementSource(audio);
  ttsAnalyser = ctx.createAnalyser();
  ttsAnalyser.fftSize = 64;
  ttsAnalyser.smoothingTimeConstant = 0.7;
  source.connect(ttsAnalyser);
  ttsAnalyser.connect(ctx.destination);

  await new Promise<void>((resolve) => {
    const cleanup = () => {
      if (wordRevealTimer !== null) {
        clearInterval(wordRevealTimer);
        wordRevealTimer = null;
      }
      URL.revokeObjectURL(audioUrl);
      ttsAnalyser = null;
      currentAudio = null;
    };

    audio.onended = () => {
      if (onTextProgress) onTextProgress(originalText || text);
      cleanup();
      resolve();
    };
    audio.onerror = () => {
      if (onTextProgress) onTextProgress(originalText || text);
      cleanup();
      resolve();
    };

    audio.onplay = () => {
      onPlayStart?.();
      if (onTextProgress) {
        const revealSource = originalText || text;
        const words = revealSource.split(/(\s+)/);
        const totalTokens = words.length;
        const duration = audio.duration;

        if (!duration || !isFinite(duration) || totalTokens <= 1) {
          onTextProgress(revealSource);
        } else {
          const intervalMs = Math.max(30, (duration * 1000) / (totalTokens * 0.55));
          let revealed = 0;
          wordRevealTimer = setInterval(() => {
            revealed += 1;
            if (revealed >= totalTokens) {
              onTextProgress(revealSource);
              if (wordRevealTimer !== null) {
                clearInterval(wordRevealTimer);
                wordRevealTimer = null;
              }
            } else {
              onTextProgress(words.slice(0, revealed).join(''));
            }
          }, intervalMs);
        }
      }
    };

    if (signal?.aborted) {
      if (onTextProgress) onTextProgress(originalText || text);
      cleanup();
      onPlayStart?.();
      resolve();
      return;
    }

    signal?.addEventListener('abort', () => {
      if (onTextProgress) onTextProgress(originalText || text);
      audio.pause();
      audio.src = '';
      cleanup();
      resolve();
    }, { once: true });

    audio.play().catch(() => {
      onPlayStart?.();
      if (onTextProgress) onTextProgress(originalText || text);
      cleanup();
      resolve();
    });
  });
}

/** Immediately stop any playing audio (including streaming TTS sessions). */
export function stopAllAudio() {
  streamingAborted = true;
  if (wordRevealTimer !== null) {
    clearInterval(wordRevealTimer);
    wordRevealTimer = null;
  }
  if (currentSourceNode) {
    try { currentSourceNode.stop(); } catch {}
    currentSourceNode = null;
  }
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
  }
  // Abort any active streaming TTS session
  if (activeStreamingSession) {
    activeStreamingSession.abort();
    activeStreamingSession = null;
  }
  ttsAnalyser = null;
}

// ─── Sentence-Pipelined Streaming TTS ──────────────────────────────────────

/**
 * A streaming TTS session that accepts LLM chunks incrementally, detects
 * sentence boundaries, sends each sentence to Deepgram TTS immediately,
 * and queues audio playback back-to-back. This dramatically reduces
 * time-to-first-audio compared to waiting for the full response.
 */
export interface StreamingTTSSession {
  /** Feed a raw LLM chunk — internally accumulates and detects sentence boundaries. */
  feedChunk(chunk: string): void;
  /** Signal that all text has been fed — flushes any remaining buffer as the final sentence. */
  finish(): void;
  /** Resolves when all queued audio has finished playing. */
  done: Promise<void>;
  /** Returns all accumulated text fed so far. */
  getFullText(): string;
  /** Abort the session (used internally by stopAllAudio). */
  abort(): void;
}

interface QueuedSentence {
  sentence: string;
  audioPromise: Promise<AudioBuffer | null>;
}

/** Clean text for TTS — convert emotional cues to spoken equivalents, strip the rest. */
function cleanForTTS(text: string): string {
  return text
    // Convert emotional cues to spoken interjections TTS can voice naturally
    .replace(/\*giggles?\*/gi, 'hehe, ')
    .replace(/\*laughs? brightly\*/gi, 'hahaha, ')
    .replace(/\*laughs? heartily\*/gi, 'hahaha, ')
    .replace(/\*laughs? softly\*/gi, 'heh, ')
    .replace(/\*laughs? gently\*/gi, 'heh heh, ')
    .replace(/\*laughs?\*/gi, 'haha, ')
    .replace(/\*chuckles? (warmly|thoughtfully|elegantly)\*/gi, 'heh heh, ')
    .replace(/\*chuckles?\*/gi, 'heh, ')
    .replace(/\*snickers?\*/gi, 'hehe, ')
    .replace(/\*belly laughs?\*/gi, 'hahahaha, ')
    .replace(/\*sighs?\*/gi, 'ahh, ')
    .replace(/\*gasps?\*/gi, 'oh! ')
    .replace(/\*whistles?\*/gi, 'whew, ')
    // Strip remaining asterisk cues (actions, body language, emotional states)
    .replace(/\*[^*]+\*/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\[[^\]]+\]/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/\n{2,}/g, '. ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Fetch and decode a single sentence's audio from Deepgram. */
async function fetchSentenceAudio(
  sentence: string,
  voice: string,
  signal?: AbortSignal
): Promise<AudioBuffer | null> {
  const clean = cleanForTTS(sentence);
  if (!clean || clean.length < 2) return null;

  try {
    const response = await fetch(
      `https://api.deepgram.com/v1/speak?model=${voice}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Token ${DEEPGRAM_API_KEY}`,
          'Content-Type': 'text/plain',
        },
        body: clean,
        signal,
      }
    );

    if (!response.ok) {
      console.error(`Deepgram TTS sentence error: ${response.status}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const ctx = ensureAudioCtx();
    if (ctx.state === 'suspended') await ctx.resume();
    return await ctx.decodeAudioData(arrayBuffer);
  } catch (e: any) {
    if (e.name !== 'AbortError') {
      console.warn('Sentence TTS fetch failed:', e);
    }
    return null;
  }
}

/**
 * Create a streaming TTS session. Feed LLM chunks as they arrive via
 * `feedChunk()`, call `finish()` when the LLM response is complete, and
 * `await done` to wait for all audio to finish playing.
 *
 * Audio for each sentence starts fetching as soon as a sentence boundary
 * is detected, and sentences play back-to-back in order.
 */
export function createStreamingTTS(
  agentName: string,
  opts: {
    signal?: AbortSignal;
    onPlayStart?: () => void;
    onTextProgress?: (text: string) => void;
    voice?: string;
  } = {}
): StreamingTTSSession {
  const { signal, onPlayStart, onTextProgress, voice: customVoice } = opts;
  const voice = customVoice || DEEPGRAM_VOICES[agentName] || DEFAULT_VOICE;

  // Internal abort controller for this session
  const sessionAbort = new AbortController();
  // Combine external signal with session abort
  const combinedSignal = signal
    ? ((): AbortSignal => {
        // If external signal already aborted, abort immediately
        if (signal.aborted) { sessionAbort.abort(); return sessionAbort.signal; }
        signal.addEventListener('abort', () => sessionAbort.abort(), { once: true });
        return sessionAbort.signal;
      })()
    : sessionAbort.signal;

  let rawBuffer = '';          // Accumulates raw LLM text waiting for sentence boundary
  let fullText = '';           // All text fed so far
  let revealedText = '';       // Text already revealed (completed sentences)
  let playStarted = false;     // Whether onPlayStart has been called
  let finished = false;        // Whether finish() has been called
  let aborted = false;

  const queue: QueuedSentence[] = [];
  let queueResolve: (() => void) | null = null;
  let queuePromise: Promise<void> | null = null;

  // Sentence boundary detection with clause-level fallback for long segments.
  // Reduced from 15 to 10 to catch short exclamations like "Hahaha!" or "Mashallah!"
  const MIN_SENTENCE_LENGTH = 10;
  // If a buffer exceeds this length without a sentence boundary, split at clause boundaries
  const CLAUSE_SPLIT_THRESHOLD = 80;

  function detectSentenceBoundary(buffer: string): { sentence: string; remainder: string } | null {
    // 1) Try sentence-ending punctuation first (.!?)
    for (let i = MIN_SENTENCE_LENGTH; i < buffer.length; i++) {
      const ch = buffer[i];
      if ((ch === '.' || ch === '!' || ch === '?') && (i + 1 >= buffer.length || buffer[i + 1] === ' ' || buffer[i + 1] === '\n')) {
        // Skip likely abbreviations like "U.S.", "Dr.", "Mr."
        const before = buffer.substring(Math.max(0, i - 3), i);
        if (before.includes('.') && before.length <= 3) continue;
        
        const sentence = buffer.substring(0, i + 1).trim();
        const remainder = buffer.substring(i + 1).trimStart();
        if (sentence.length >= MIN_SENTENCE_LENGTH) {
          return { sentence, remainder };
        }
      }
    }

    // 2) Clause-level fallback: if buffer is long, split at comma, semicolon, colon, or dash
    //    This prevents long TTS chunks that make the discussion feel dead
    if (buffer.length >= CLAUSE_SPLIT_THRESHOLD) {
      // Search backwards from end to find the last clause boundary after a reasonable minimum
      let bestSplit = -1;
      for (let i = Math.floor(CLAUSE_SPLIT_THRESHOLD * 0.5); i < buffer.length; i++) {
        const ch = buffer[i];
        if ((ch === ',' || ch === ';' || ch === ':') && i + 1 < buffer.length && buffer[i + 1] === ' ') {
          bestSplit = i;
        }
        // Also split at " — " or " - " (em/en dash patterns)
        if (ch === '—' && i + 1 < buffer.length && buffer[i + 1] === ' ') {
          bestSplit = i;
        }
        if (ch === '-' && i > 0 && buffer[i - 1] === ' ' && i + 1 < buffer.length && buffer[i + 1] === ' ') {
          bestSplit = i;
        }
      }
      if (bestSplit > MIN_SENTENCE_LENGTH) {
        const sentence = buffer.substring(0, bestSplit + 1).trim();
        const remainder = buffer.substring(bestSplit + 1).trimStart();
        if (sentence.length >= MIN_SENTENCE_LENGTH) {
          return { sentence, remainder };
        }
      }
    }

    return null;
  }

  function enqueueSentence(sentence: string) {
    if (aborted || !sentence.trim()) return;

    // Fire off TTS fetch immediately (non-blocking)
    const audioPromise = DEEPGRAM_API_KEY
      ? fetchSentenceAudio(sentence, voice, combinedSignal)
      : Promise.resolve(null);

    queue.push({ sentence, audioPromise });

    // Wake up the playback loop if it's waiting
    if (queueResolve) {
      queueResolve();
      queueResolve = null;
      queuePromise = null;
    }
  }

  /** Wait for the next item to appear in the queue (or finish signal). */
  function waitForQueue(): Promise<void> {
    if (queue.length > 0 || (finished && queue.length === 0)) {
      return Promise.resolve();
    }
    if (!queuePromise) {
      queuePromise = new Promise<void>((resolve) => { queueResolve = resolve; });
    }
    return queuePromise;
  }

  /** Word-by-word reveal for a single sentence during its audio playback. */
  function revealSentenceWords(
    sentence: string,
    durationSecs: number
  ): Promise<void> {
    return new Promise((resolve) => {
      const words = sentence.split(/(\s+)/); // keep whitespace tokens
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

  // ── Playback loop (runs concurrently) ──────────────────────────────────
  const donePromise = (async () => {
    // Stop any previous audio before starting the session
    stopAllAudio();
    streamingAborted = false;
    activeStreamingSession = session; // eslint-disable-line @typescript-eslint/no-use-before-define

    let sentenceIndex = 0;

    while (true) {
      if (aborted) break;

      // Wait for something in the queue or finish signal
      await waitForQueue();

      if (aborted) break;

      // If queue is empty and we're finished, we're done
      if (queue.length === 0 && finished) break;

      // Pop next sentence from queue
      if (queue.length === 0) continue;
      const item = queue.shift()!;
      sentenceIndex++;

      // Await the TTS audio for this sentence
      const audioBuffer = await item.audioPromise;
      if (aborted) break;

      if (!audioBuffer) {
        // TTS failed for this sentence — reveal text immediately without audio
        revealedText += (revealedText && !revealedText.endsWith(' ') ? ' ' : '') + item.sentence;
        onTextProgress?.(revealedText);
        continue;
      }

      // Fire onPlayStart on first sentence
      if (!playStarted) {
        playStarted = true;
        onPlayStart?.();
      }

      // Set up AnalyserNode + source for this sentence
      const ctx = ensureAudioCtx();
      if (ctx.state === 'suspended') await ctx.resume();

      ttsAnalyser = ttsAnalyser || ctx.createAnalyser();
      if (sentenceIndex === 1) {
        // Create fresh analyser for first sentence
        ttsAnalyser = ctx.createAnalyser();
        ttsAnalyser.fftSize = 64;
        ttsAnalyser.smoothingTimeConstant = 0.7;
      }

      const sourceNode = ctx.createBufferSource();
      sourceNode.buffer = audioBuffer;
      sourceNode.connect(ttsAnalyser!);
      ttsAnalyser!.connect(ctx.destination);
      currentSourceNode = sourceNode;

      // Play and reveal words simultaneously
      const spacer = revealedText && !revealedText.endsWith(' ') ? ' ' : '';
      const sentenceWithSpacer = spacer + item.sentence;

      await new Promise<void>((resolve) => {
        sourceNode.onended = () => {
          currentSourceNode = null;
          resolve();
        };

        combinedSignal.addEventListener('abort', () => {
          try { sourceNode.stop(); } catch {}
          currentSourceNode = null;
          resolve();
        }, { once: true });

        try {
          sourceNode.start(0);
        } catch {
          currentSourceNode = null;
          resolve();
          return;
        }

        // Run word reveal concurrently with playback
        revealSentenceWords(sentenceWithSpacer, audioBuffer.duration).then(() => {
          // Word reveal finished — playback may still be going, that's fine
        });
      });

      if (aborted) break;
    }

    // ── Cleanup ────────────────────────────────────────────────────────
    // Ensure all text is revealed even if audio failed for some sentences
    if (onTextProgress && !aborted) {
      onTextProgress(fullText);
    }
    if (!playStarted) {
      onPlayStart?.(); // Ensure callback fires even if no audio played
    }
    ttsAnalyser = null;
    if (activeStreamingSession === session) { // eslint-disable-line @typescript-eslint/no-use-before-define
      activeStreamingSession = null;
    }
  })();

  const session: StreamingTTSSession = {
    feedChunk(chunk: string) {
      if (finished || aborted) return;
      rawBuffer += chunk;
      fullText += chunk;

      // Extract complete sentences from buffer
      let boundary: ReturnType<typeof detectSentenceBoundary>;
      while ((boundary = detectSentenceBoundary(rawBuffer)) !== null) {
        enqueueSentence(boundary.sentence);
        rawBuffer = boundary.remainder;
      }
    },

    finish() {
      if (finished) return;
      finished = true;
      // Flush any remaining text as the final sentence
      const remaining = rawBuffer.trim();
      if (remaining) {
        enqueueSentence(remaining);
        rawBuffer = '';
      }
      // Wake up playback loop so it can see finished=true
      if (queueResolve) {
        queueResolve();
        queueResolve = null;
        queuePromise = null;
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
      if (wordRevealTimer !== null) {
        clearInterval(wordRevealTimer);
        wordRevealTimer = null;
      }
      // Wake up playback loop
      if (queueResolve) {
        queueResolve();
        queueResolve = null;
        queuePromise = null;
      }
    }
  };

  return session;
}
