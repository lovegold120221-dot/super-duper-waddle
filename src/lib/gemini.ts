import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { MASTER_PANEL_PROMPT } from "./prompts";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Per-agent turn generation via Gemini (used when agent provider === 'cloud')
export async function* streamAgentTurnGemini(
  agent: { name: string; role: string; prompt: string },
  topic: string,
  history: Array<{ speaker: string; role: string; text: string }>,
  turnContext: { isFirst: boolean; isLast: boolean; round?: number; nextSpeaker?: string; prevSpeaker?: string },
  signal?: AbortSignal
): AsyncGenerator<string> {
  const historyBlock = history.length > 0
    ? '\n\nDISCUSSION SO FAR:\n' + history.map(h => `[${h.speaker}]: ${h.text}`).join('\n\n')
    : '';

  const isManagerBridge = !turnContext.isFirst && !turnContext.isLast && agent.name === 'Nexus';
  const nextSpeaker = turnContext.nextSpeaker;
  const prevSpeaker = turnContext.prevSpeaker;

  let turnInstruction: string;
  if (turnContext.isFirst) {
    turnInstruction = `Topic: "${topic}". You are the MEETING HOST. Introduce yourself casually, then go around the room and have each person introduce themselves. Ask "So, who wants to kick us off?" to start the discussion. 4-6 sentences. Be chill, natural, like a team standup.`;
  } else if (turnContext.isLast) {
    turnInstruction = `You have heard from the full team on "${topic}". Synthesize what you heard and make a clear decision. Close it out naturally. 2-3 sentences max. Be warm but decisive.`;
  } else if (isManagerBridge) {
    const prev = history.length > 0 ? history[history.length - 1] : null;
    const reaction = prev ? `${prev.speaker} just made a good point about "${prev.text.substring(0, 80)}..."` : '';
    turnInstruction = `${reaction ? reaction + '\n\n' : ''}You are the HOST. React briefly (like "Ooh interesting", "Good call", "Haha true"), then ask who wants to go next. Examples: "Who wants to jump in?", "Anyone else got thoughts?", "${nextSpeaker || 'You'} — what do you think?" Call on ${nextSpeaker || 'someone'} by name to speak. Keep it short — 1-2 sentences. Be natural, not formal.`;
  } else {
    const prev = history.length > 0 ? history[history.length - 1] : null;
    const prevContext = prev ? `${prev.speaker} just said: "${prev.text.substring(0, 100)}..."` : '';
    turnInstruction = `${prevContext ? prevContext + '\n\n' : ''}You are ${agent.name}. React to what was said — agree, build on it, or add a new angle. 1-2 sentences max. Be casual, not formal. Talk like you are in a meeting, not presenting. Use your cultural expressions naturally. Don't repeat what was already said — add something new.`;
  }

  const prompt = `You are ${agent.name}, ${agent.role}.${agent.prompt ? ` ${agent.prompt}` : ''}${historyBlock}

${turnInstruction}

STYLE:
- Casual, natural speaking — like a team meeting, not a presentation
- Short sentences, get to the point
- No bullet points, no headers, no markdown
- React to specifics, not generic praise
- Keep it SHORT: ${isManagerBridge ? '1 sentence' : turnContext.isFirst || turnContext.isLast ? '2-3 sentences' : '1-2 sentences max'}`;

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


