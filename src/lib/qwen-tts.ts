export async function generateQwenTTS(
  text: string,
  voiceId: string = 'Chelsie',
  serverUrl: string = 'http://localhost:7861'
): Promise<string | null> {
  try {
    const res = await fetch(`${serverUrl}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        voice: voiceId
      })
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Qwen TTS error ${res.status}: ${errText}`);
    }

    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Qwen TTS error:', error);
    return null;
  }
}

export async function checkQwenHealth(serverUrl: string = 'http://localhost:7861'): Promise<boolean> {
  try {
    const res = await fetch(`${serverUrl}/health`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return false;
    const data = await res.json();
    return data.status === 'healthy';
  } catch {
    return false;
  }
}
