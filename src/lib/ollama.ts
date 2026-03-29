export async function fetchOllamaModels(baseUrl: string = 'http://localhost:11434'): Promise<string[]> {
  try {
    const res = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.models || []).map((m: any) => m.name as string);
  } catch {
    return [];
  }
}

export interface AgentTurn {
  name: string;
  role: string;
  prompt: string;
}

// Per-agent streaming generation. Each agent gets its OWN model call with full history as context.
export async function* streamAgentResponse(
  agent: AgentTurn,
  topic: string,
  history: Array<{ speaker: string; role: string; text: string }>,
  turnContext: { isFirst: boolean; isLast: boolean; round?: number; nextSpeaker?: string; prevSpeaker?: string },
  ollamaUrl: string,
  modelName: string,
  signal?: AbortSignal
): AsyncGenerator<string> {
  const historyBlock = history.length > 0
    ? '\n\n━━ DISCUSSION SO FAR ━━\n' +
      history.map(h => `[${h.speaker} — ${h.role}]:\n${h.text}`).join('\n\n') +
      '\n━━━━━━━━━━━━━━━━━━━━━━'
    : '';

  const systemPrompt = `${agent.prompt ? agent.prompt : `You are ${agent.name}, ${agent.role} in a live internal strategy panel discussion.`}
${historyBlock}

SPEAKING RULES (non-negotiable):
• Speak in 2-3 sentences — fast-paced, lively, natural expert spoken voice
• React DIRECTLY to what the previous speaker said
• Use your unique ACCENT and cultural expressions naturally in EVERY response
• Include emotional reactions: *giggles*, *laughs*, *chuckles*, spoken "Hahaha!", "Ohhh!", "Wow!"
• Be CONSTRUCTIVE and POSITIVE — never dismissive or negative, always build on ideas
• Focus discussion on: app platform, tech stack, AI services, architecture planning
• NEVER use bullet points, headers, or markdown formatting
• NEVER start with your own name
• Sound like a human expert with real warmth, laughter, giggles, and cultural charm
• Use natural human expressions LIBERALLY: *giggles*, *laughs brightly*, *claps hands*, *nods enthusiastically*
• Quick reactions and rapid back-and-forth with genuine emotion`;

  const isManagerBridge = !turnContext.isFirst && !turnContext.isLast && agent.name === 'Nexus';
  const nextSpeaker = turnContext.nextSpeaker;
  const prevSpeaker = turnContext.prevSpeaker;

  const turnInstruction = turnContext.isFirst
    ? `Topic: "${topic}". You are the MEETING HOST. Introduce yourself casually, then go around the room and have each person introduce themselves. Ask "So, who wants to kick us off?" to start the discussion. 2-3 sentences. Be chill, natural, like a team standup.`
    : turnContext.isLast
    ? `You have heard from the full team on "${topic}". Synthesize what you heard and make a clear decision. Close it out naturally. 2-3 sentences max. Be warm but decisive.`
    : isManagerBridge
    ? `${history.length > 0 ? `${history[history.length - 1].speaker} just said: "${history[history.length - 1].text.substring(0, 80)}..."\n\n` : ''}You are the HOST. React briefly (like "Ooh interesting", "Good call", "Haha true"), then ask who wants to go next. Call on ${nextSpeaker || 'someone'} by name to speak. Keep it short — 1 sentence. Be natural, not formal.`
    : `${history.length > 0 ? `${history[history.length - 1].speaker} just said: "${history[history.length - 1].text.substring(0, 100)}..."\n\n` : ''}You are ${agent.name}. React to what was said — agree, build on it, or add a new angle. 1-2 sentences max. Be casual, not formal. Talk like you are in a meeting, not presenting. Don't repeat what was already said — add something new.`;

  const res = await fetch(`${ollamaUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: modelName,
      system: systemPrompt,
      prompt: turnInstruction,
      stream: true,
      options: {
        temperature: 0.85,
        top_p: 0.92,
        // High num_predict so thinking models (qwen3) have room to think + respond
        num_predict: 2500,
        repeat_penalty: 1.1
      }
    }),
    signal
  });

  if (!res.ok || !res.body) {
    throw new Error(`Ollama error ${res.status}: ${res.statusText}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      console.log('Ollama stream completed naturally');
      break;
    }
    const text = decoder.decode(value, { stream: true });
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      try {
        const json = JSON.parse(line);
        // Skip thinking tokens (qwen3 uses a separate `thinking` field; `response` is empty during thinking)
        if (json.response) {
          console.log('Ollama chunk received:', json.response.substring(0, 50) + '...');
          yield json.response;
        }
        // Don't return early on json.done - let the natural stream completion handle it
      } catch { /* partial JSON line */ }
    }
  }
}

// Legacy full-script generator (kept for fallback use)
export async function* generateOllamaPanelDiscussion(
  topic: string,
  agents: any[],
  options: { systemInstruction?: string } = {},
  signal?: AbortSignal,
  baseUrl: string = 'http://localhost:11434',
  model: string = 'llama3'
): AsyncGenerator<string> {
  const res = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: options.systemInstruction || '' },
        { role: 'user', content: `Run a panel discussion with these agents about: ${topic}. Agents: ${agents.map(a => a.name).join(', ')}` }
      ],
      stream: true
    }),
    signal
  });
  if (!res.ok || !res.body) throw new Error(`Ollama error ${res.status}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const json = JSON.parse(line);
        if (json.message?.content) yield json.message.content;
        if (json.done) return;
      } catch {}
    }
  }
}


