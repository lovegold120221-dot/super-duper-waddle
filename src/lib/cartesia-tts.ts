const CARTESIA_VERSION = '2025-04-16';

export async function generateCartesiaTTS(
  text: string,
  voiceId: string,
  apiKey: string
): Promise<string | null> {
  try {
    const response = await fetch('https://api.cartesia.ai/tts/bytes', {
      method: 'POST',
      headers: {
        'Cartesia-Version': CARTESIA_VERSION,
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model_id: 'sonic-3',
        transcript: text.substring(0, 1000),
        voice: { mode: 'id', id: voiceId },
        output_format: {
          container: 'wav',
          encoding: 'pcm_s16le',
          sample_rate: 44100,
        },
        speed: 'normal',
        generation_config: { speed: 1, volume: 1, emotion: 'neutral' },
      }),
    });

    if (!response.ok) {
      const err = await response.text().catch(() => response.statusText);
      console.error('Cartesia TTS error:', response.status, err);
      return null;
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Cartesia TTS error:', error);
    return null;
  }
}

export async function checkCartesiaKey(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.cartesia.ai/voices?limit=1', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Cartesia-Version': '2026-03-01',
      },
      signal: AbortSignal.timeout(4000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
