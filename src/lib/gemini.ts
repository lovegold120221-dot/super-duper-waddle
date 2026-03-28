import { GoogleGenAI, ThinkingLevel, Modality } from "@google/genai";
import { MASTER_PANEL_PROMPT } from "./prompts";
import type { TurnContext } from "./ollama";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Per-agent turn generation via Gemini (used when agent provider === 'cloud')
export async function* streamAgentTurnGemini(
  agent: { name: string; role: string; prompt: string },
  topic: string,
  history: Array<{ speaker: string; role: string; text: string }>,
  turnContext: TurnContext,
  signal?: AbortSignal
): AsyncGenerator<string> {
  const historyBlock = history.length > 0
    ? '\n\nDISCUSSION SO FAR:\n' + history.map(h => `[${h.speaker}]: ${h.text}`).join('\n\n')
    : '';

  const last = history[history.length - 1];
  const lengthRule = turnContext.round === 1
    ? '2-3 sentences max. Short and punchy.'
    : turnContext.round === 2
    ? '3-5 sentences. Real back-and-forth.'
    : '5-8 sentences. Go deep.';

  const prompt = `${agent.prompt || `You are ${agent.name}, ${agent.role}.`}
${historyBlock}

${turnContext.isFirst
    ? `Open the panel on: "${topic}". Frame the challenge with energy. Give the team something to react to. 2-3 sentences.`
    : turnContext.isLast
    ? `Synthesize everything. Make the call. Be decisive. 10-14 sentences.`
    : `${last?.speaker || 'The previous speaker'} said: "${last?.text?.substring(0, 250) || ''}"

React to that and contribute your expert take as ${agent.role}. Be specific. Reference actual words from the discussion. ${lengthRule}`}

NEVER use bullet points, headers, or markdown. NEVER start with your name. Sound human — emotional cues like [laughs] or [sighs] are welcome when genuine.`;

  const stream = await ai.models.generateContentStream({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: { thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } }
  });

  for await (const chunk of stream) {
    if (signal?.aborted) return;
    if (chunk.text) yield chunk.text;
  }
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
${options.userPreferences || 'The first phase must feel like a real internal panel discussion with 5 agents and a manager. It must feel human, realistic, and technically grounded. CRITICAL: You MUST use natural human-like conversational elements. Include occasional reaction tags (e.g., [pauses], [sighs], [a little annoyed]), simulate partial overlaps (e.g., [cuts in]), and ensure agents do NOT agree instantly. Make the panel feel highly dynamic and realistic.'}

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
Simulate a realistic 5-10 minutes internal panel meeting, then present the final structured plan.
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
