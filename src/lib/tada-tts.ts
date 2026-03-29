// TADA TTS Integration
// Hume AI's TADA (Text-Acoustic Dual Alignment) TTS model
// https://github.com/HumeAI/tada

export async function generateTadaTTS(
  text: string,
  voiceId: string = 'orion',
  serverUrl: string = 'http://localhost:7862'
): Promise<string | null> {
  try {
    const res = await fetch(`${serverUrl}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice: voiceId }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`TADA TTS error ${res.status}: ${errText}`);
    }

    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('TADA TTS error:', error);
    return null;
  }
}

export async function checkTadaHealth(serverUrl: string = 'http://localhost:7862'): Promise<boolean> {
  try {
    const res = await fetch(`${serverUrl}/health`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return false;
    const data = await res.json();
    return data.status === 'healthy';
  } catch {
    return false;
  }
}

// Voices backed by reference audio files in tada_voices/ on the server
export const TADA_VOICES = [
  { id: 'orion',   name: 'Orion',   desc: 'Male, neutral (default reference)' },
  { id: 'lyra',    name: 'Lyra',    desc: 'Female, warm tone' },
  { id: 'calder',  name: 'Calder',  desc: 'Male, deep voice' },
  { id: 'seren',   name: 'Seren',   desc: 'Female, clear tone' },
  { id: 'caspian', name: 'Caspian', desc: 'Male, authoritative' },
  { id: 'nova',    name: 'Nova',    desc: 'Female, bright tone' },
  { id: 'remy',    name: 'Remy',    desc: 'Male, calm voice' },
  { id: 'wren',    name: 'Wren',    desc: 'Female, gentle tone' },
];
