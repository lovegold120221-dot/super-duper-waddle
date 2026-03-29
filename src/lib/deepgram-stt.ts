// Deepgram real-time STT via WebSocket + mic AnalyserNode for visualiser
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

export interface STTCallbacks {
  /** Fired for every interim/final transcript fragment. */
  onTranscript: (text: string, isFinal: boolean) => void;
  /** Fired ~60 fps with the current frequency byte array (0-255) for mic visualiser. */
  onAudioLevel: (levels: Uint8Array) => void;
  /** Fired when the session ends (user stop or error). */
  onEnd: () => void;
}

let mediaStream: MediaStream | null = null;
let audioCtx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let animFrameId: number | null = null;
let ws: WebSocket | null = null;
let processor: ScriptProcessorNode | null = null;

/**
 * Start real-time STT.
 * Opens the mic, connects to Deepgram streaming, and begins pumping
 * transcript + audio-level callbacks.
 */
export async function startSTT(cb: STTCallbacks): Promise<void> {
  // Clean up any previous session
  stopSTT();

  if (!DEEPGRAM_API_KEY) {
    console.warn('Deepgram API key not set — STT disabled');
    cb.onEnd();
    return;
  }

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 16000,
      },
    });
  } catch (err) {
    console.error('Mic access denied:', err);
    cb.onEnd();
    return;
  }

  // ── Audio analyser for mic visualiser ──────────────────────────────────
  audioCtx = new AudioContext({ sampleRate: 16000 });
  const source = audioCtx.createMediaStreamSource(mediaStream);

  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 128;
  analyser.smoothingTimeConstant = 0.6;
  source.connect(analyser);

  const freqData = new Uint8Array(analyser.frequencyBinCount);
  const pump = () => {
    if (!analyser) return;
    analyser.getByteFrequencyData(freqData);
    cb.onAudioLevel(freqData);
    animFrameId = requestAnimationFrame(pump);
  };
  pump();

  // ── ScriptProcessor to capture raw PCM and send to Deepgram ────────────
  // 4096 buffer, mono, 16 kHz
  processor = audioCtx.createScriptProcessor(4096, 1, 1);
  source.connect(processor);
  processor.connect(audioCtx.destination); // must connect to keep processing alive

  // ── Deepgram WebSocket ─────────────────────────────────────────────────
  const dgUrl =
    `wss://api.deepgram.com/v1/listen?` +
    `encoding=linear16&sample_rate=16000&channels=1` +
    `&model=nova-2&punctuate=true&interim_results=true&endpointing=300` +
    `&vad_events=true&smart_format=true`;

  ws = new WebSocket(dgUrl, ['token', DEEPGRAM_API_KEY]);
  ws.binaryType = 'arraybuffer';

  ws.onopen = () => {
    console.log('Deepgram STT WebSocket connected');

    // Start sending PCM frames
    processor!.onaudioprocess = (e) => {
      if (ws?.readyState !== WebSocket.OPEN) return;
      const float32 = e.inputBuffer.getChannelData(0);
      // Convert Float32 → Int16 PCM
      const int16 = new Int16Array(float32.length);
      for (let i = 0; i < float32.length; i++) {
        const s = Math.max(-1, Math.min(1, float32[i]));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      ws!.send(int16.buffer);
    };
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'Results' && data.channel?.alternatives?.[0]) {
        const alt = data.channel.alternatives[0];
        const transcript = (alt.transcript || '').trim();
        if (transcript) {
          cb.onTranscript(transcript, data.is_final === true);
        }
      }
    } catch {
      // ignore non-JSON frames
    }
  };

  ws.onerror = (e) => {
    console.error('Deepgram STT WS error:', e);
  };

  ws.onclose = () => {
    console.log('Deepgram STT WebSocket closed');
    cleanup();
    cb.onEnd();
  };
}

/** Stop STT, close mic & websocket, cancel visualiser loop. */
export function stopSTT(): void {
  // Send close-stream message to Deepgram
  if (ws && ws.readyState === WebSocket.OPEN) {
    try { ws.send(JSON.stringify({ type: 'CloseStream' })); } catch {}
  }
  cleanup();
}

function cleanup() {
  if (animFrameId !== null) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
  if (processor) {
    processor.onaudioprocess = null;
    processor.disconnect();
    processor = null;
  }
  if (analyser) {
    analyser.disconnect();
    analyser = null;
  }
  if (audioCtx) {
    audioCtx.close().catch(() => {});
    audioCtx = null;
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach((t) => t.stop());
    mediaStream = null;
  }
  if (ws) {
    ws.onclose = null; // prevent double-fire of onEnd
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close();
    }
    ws = null;
  }
}
