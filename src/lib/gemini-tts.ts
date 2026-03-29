// Gemini TTS API configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_TTS_MODEL = "gemini-2.5-flash-preview-tts";
const GEMINI_TTS_API = "streamGenerateContent";

// Available Gemini voices
const GEMINI_TTS_VOICES = [
  'Orus',
  'Puck',
  'Charon', 
  'Kore',
  'Fenrir',
  'Zephyr',
  'Aoede'
];

export async function generateGeminiTTS(text: string, voice: string = 'Orus'): Promise<string | null> {
  try {
    if (!GEMINI_API_KEY) {
      console.error('Gemini API key not found');
      return null;
    }

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Read aloud in a warm and friendly tone: ${text}`
            }
          ]
        }
      ],
      generationConfig: {
        responseModalities: ["audio"],
        temperature: 1,
        speech_config: {
          voice_config: {
            prebuilt_voice_config: {
              voice_name: voice
            }
          }
        }
      }
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TTS_MODEL}:${GEMINI_TTS_API}?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini TTS API error: ${response.statusText}`);
    }

    // Get the response as array buffer
    const audioBuffer = await response.arrayBuffer();
    
    // Convert to base64 for audio playback
    const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
    const audioDataUrl = `data:audio/wav;base64,${audioBase64}`;
    
    return audioDataUrl;

  } catch (error) {
    console.error('Error generating Gemini TTS:', error);
    return null;
  }
}

export async function checkGeminiKey(): Promise<boolean> {
  try {
    if (!GEMINI_API_KEY) return false;
    
    // Test with a simple request
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TTS_MODEL}:${GEMINI_TTS_API}?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "test" }] }],
          generationConfig: {
            responseModalities: ["audio"],
            speech_config: {
              voice_config: {
                prebuilt_voice_config: {
                  voice_name: "Orus"
                }
              }
            }
          }
        })
      }
    );
    
    return response.ok;
  } catch {
    return false;
  }
}

export { GEMINI_TTS_VOICES };
