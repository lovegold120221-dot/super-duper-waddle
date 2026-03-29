// VibeVoice TTS Integration
// High-quality voice synthesis using Microsoft Vibe model

export interface VibeVoiceConfig {
  model: string;
  device: string;
  sampleRate: number;
  voice: string;
  speed: number;
  pitch: number;
  emotion?: string;
}

export class VibeVoiceTTS {
  private config: VibeVoiceConfig;
  private baseUrl: string;
  private apiKey?: string;

  constructor(config: Partial<VibeVoiceConfig> = {}) {
    this.config = {
      model: 'microsoft/vibe',
      device: 'cpu',
      sampleRate: 22050,
      voice: 'default',
      speed: 1.0,
      pitch: 1.0,
      ...config
    };
    
    this.baseUrl = process.env.VIBEVOICE_URL || 'http://localhost:8000';
    this.apiKey = process.env.VIBEVOICE_API_KEY;
  }

  async generateSpeech(text: string, options: Partial<VibeVoiceConfig> = {}): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
        },
        body: JSON.stringify({
          text: text.substring(0, 500), // Limit text length for performance
          config: { ...this.config, ...options }
        })
      });

      if (!response.ok) {
        throw new Error(`VibeVoice error: ${response.status} ${response.statusText}`);
      }

      const audioBlob = await response.blob();
      return URL.createObjectURL(audioBlob);
    } catch (error) {
      console.error('VibeVoice TTS error:', error);
      throw error;
    }
  }

  async generateSpeechStream(text: string, options: Partial<VibeVoiceConfig> = {}): Promise<ReadableStream> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tts/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
        },
        body: JSON.stringify({
          text: text.substring(0, 500),
          config: { ...this.config, ...options }
        })
      });

      if (!response.ok) {
        throw new Error(`VibeVoice stream error: ${response.status} ${response.statusText}`);
      }

      return response.body!;
    } catch (error) {
      console.error('VibeVoice TTS stream error:', error);
      throw error;
    }
  }

  async getVoices(): Promise<Array<{ id: string; name: string; language: string; gender: string }>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/voices`, {
        headers: {
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch voices: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error('VibeVoice voices error:', error);
      return [];
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        headers: {
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
        }
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Singleton instance
let vibeVoiceInstance: VibeVoiceTTS | null = null;

export function getVibeVoiceTTS(): VibeVoiceTTS {
  if (!vibeVoiceInstance) {
    vibeVoiceInstance = new VibeVoiceTTS();
  }
  return vibeVoiceInstance;
}

// Integration function for Panel component
export async function generateVibeVoiceTTS(
  text: string,
  voice: string = 'default',
  emotion?: string
): Promise<string> {
  const tts = getVibeVoiceTTS();
  
  return tts.generateSpeech(text, {
    voice,
    emotion,
    speed: 1.0,
    pitch: 1.0
  });
}

// Predefined VibeVoice voices
export const VIBEVOICE_VOICES = [
  { id: 'default', name: 'Default Voice', language: 'en', gender: 'neutral' },
  { id: 'female-natural', name: 'Natural Female', language: 'en', gender: 'female' },
  { id: 'male-natural', name: 'Natural Male', language: 'en', gender: 'male' },
  { id: 'female-energetic', name: 'Energetic Female', language: 'en', gender: 'female' },
  { id: 'male-calm', name: 'Calm Male', language: 'en', gender: 'male' },
  { id: 'child-friendly', name: 'Child Friendly', language: 'en', gender: 'neutral' },
  { id: 'professional', name: 'Professional', language: 'en', gender: 'neutral' },
  { id: 'storyteller', name: 'Storyteller', language: 'en', gender: 'neutral' }
];

// Health check function
export async function checkVibeVoiceHealth(): Promise<boolean> {
  try {
    const tts = getVibeVoiceTTS();
    return await tts.checkHealth();
  } catch {
    return false;
  }
}
