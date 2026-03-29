import { GoogleGenAI, ThinkingLevel, Modality } from "@google/genai";
import { MASTER_PANEL_PROMPT } from "./prompts";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Per-agent turn generation via Gemini (used when agent provider === 'cloud')
export async function* streamAgentTurnGemini(
  agent: { name: string; role: string; prompt: string },
  topic: string,
  history: Array<{ speaker: string; role: string; text: string }>,
  turnContext: { isFirst: boolean; isLast: boolean; round?: number },
  signal?: AbortSignal
): AsyncGenerator<string> {
  const historyBlock = history.length > 0
    ? '\n\nDISCUSSION SO FAR:\n' + history.map(h => `[${h.speaker}]: ${h.text}`).join('\n\n')
    : '';

  const prompt = `You are ${agent.name}, ${agent.role}.${agent.prompt ? ` Character: ${agent.prompt}` : ''}${historyBlock}

${turnContext.isFirst
    ? `Topic for this session: "${topic}". You're leading this meeting. CRITICAL: Start with proper introductions. First introduce yourself as Nexus the Manager with some humor, then invite each specialist (Atlas, Veda, Echo, Nova, Cipher) to introduce themselves and their roles. After all introductions, frame the core challenge with energy and define what success looks like. This should be a substantial opening that establishes the professional meeting context. 4-6 sentences for the opening, then guide introductions. Keep it engaging but professional.`
    : turnContext.isLast
    ? `You've heard from the full team on "${topic}". Synthesize the strongest points, acknowledge the tension, and make a clear decisive recommendation as leader. Close with conviction. This should feel like a thorough manager summary after a 10-15 minute discussion. Now you can give a full detailed idea with your complete plan. 4-6 sentences.`
    : `${history.length > 0 ? `${history[history.length - 1]?.speaker || 'the previous speaker'} just said: "${history[history.length - 1]?.text.substring(0, 250) || ''}"\n\n` : ''}React to that and add your expert take as ${agent.role} on "${topic}". This is round ${turnContext.round || 1} of the discussion, so build upon previous points and add new insights. Keep it to 1-2 sentences with your characteristic humor, emotions, and natural human expressions. Use reactions like "*sighs*", "*chuckles*", "*facepalm*", "*nods thoughtfully*" to make it feel real. Fast and lively responses! Save your full detailed ideas for the final convergence.`}

Speak naturally in 1-2 sentences with your characteristic humor, emotions, and natural human expressions. Use reactions like "*sighs*", "*chuckles*", "*facepalm*", "*nods thoughtfully*", "*raises eyebrow*" to make it feel real. Fast and lively responses! Human expert tone. No bullet points. No name introduction.`;

  const stream = await ai.models.generateContentStream({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: { thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } }
  });

  for await (const chunk of stream) {
    if (signal?.aborted) {
      console.log('Gemini stream aborted');
      return;
    }
    if (chunk.text) {
      console.log('Gemini chunk received:', chunk.text.substring(0, 50) + '...');
      yield chunk.text;
    }
  }
  console.log('Gemini stream completed naturally');
}

export async function* generatePanelDiscussion(
  topic: string, 
  agents: any[], 
  options: {
    model?: string;
    platformTarget?: string;
    requiredFeatures?: string[];
    userPreferences?: string;
    systemInstruction?: string;
  } = {},
  signal?: AbortSignal
) {
  const runtimeInstruction = `
PROJECT_REQUEST:
${topic}

USER_PREFERENCES:
${options.userPreferences || 'The first phase must feel like a real internal panel discussion with 5 agents and a manager. It must feel human, realistic, and technically grounded. CRITICAL: You MUST use natural human-like conversational elements. Include occasional reaction tags (e.g., [pauses], [sighs], [a little annoyed]), simulate partial overlaps (e.g., [cuts in]), and ensure agents do NOT agree instantly. Make the panel feel highly dynamic and realistic. ABSOLUTELY CRITICAL: The manager MUST start with proper introductions - first introducing themselves, then inviting each specialist to introduce themselves and their role. This discussion should simulate 10-15 MINUTES of real conversation, not a quick chat. Include multiple rounds of discussion, thorough exploration, and proper debate before convergence.'}

PLATFORM_TARGET:
${options.platformTarget || 'Web app'}

REQUIRED_FEATURES:
${(options.requiredFeatures || [
  'internal multi-agent panel discussion',
  'manager-led convergence',
  'brief summary',
  'detailed todo list',
  'approval gate',
  'eventual end-to-end production workflow'
]).map(f => `- ${f}`).join('\n')}

OUTPUT_REQUIREMENT:
Simulate a realistic 10-15 minutes internal panel meeting with proper introductions, then present the final structured plan.
`;

  const responseStream = await ai.models.generateContentStream({
    model: options.model || "gemini-3-flash-preview",
    contents: runtimeInstruction,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
      systemInstruction: options.systemInstruction || MASTER_PANEL_PROMPT,
    }
  });

  for await (const chunk of responseStream) {
    if (chunk.text) {
      yield chunk.text;
    }
  }
}

export async function generateTTS(text: string, voiceName: string = 'Kore') {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const binary = atob(base64Audio);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'audio/wav' });
      return URL.createObjectURL(blob);
    }
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
}
