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
  turnContext: { isFirst: boolean; isLast: boolean; round?: number },
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
• Speak in 1-2 sentences — fast, lively, natural expert spoken voice
• React DIRECTLY to what the previous speaker said
• Use natural speech patterns with humor: "*sighs*", "*chuckles*", "*facepalm*", "Look,", "Here's the thing —", "Actually,", "Oh great, another..."
• NEVER use bullet points, headers, or markdown formatting
• NEVER start with your own name
• Sound like a human expert with real opinions, stakes, and a sense of humor
• Mix professional insight with personality - be engaging and substantive
• Use natural human expressions liberally: "*nods thoughtfully*", "*raises eyebrow*", "*pauses*", "*leans forward*"
• Quick reactions and rapid back-and-forth`;

  const turnInstruction = turnContext.isFirst
    ? `Topic for this session: "${topic}"\n\nYou're leading this meeting. CRITICAL: Start with proper introductions. First introduce yourself as Nexus the Manager with some humor, then invite each specialist (Atlas, Veda, Echo, Nova, Cipher) to introduce themselves and their roles. After all introductions, frame the core challenge with energy and define what success looks like. This should be a substantial opening that establishes the professional meeting context. 4-6 sentences for the opening, then guide introductions. Keep it engaging but professional.`
    : turnContext.isLast
    ? `You've heard from the full team on "${topic}". Synthesize the strongest points, acknowledge the tension, and make a clear decisive recommendation as leader. Close with conviction. This should feel like a thorough manager summary after a 10-15 minute discussion. Now you can give a full detailed idea with your complete plan. 4-6 sentences.`
    : `${history.length > 0 ? `${history[history.length - 1].speaker} just said: "${history[history.length - 1].text.substring(0, 250)}"\n\n` : ''}React to that and add your expert take as ${agent.role} on "${topic}". This is round ${turnContext.round || 1} of the discussion, so build upon previous points and add new insights. Keep it to 1-2 sentences with your characteristic humor, emotions, and natural human expressions. Use reactions like "*sighs*", "*chuckles*", "*facepalm*", "*nods thoughtfully*" to make it feel real. Fast and lively responses! Save your full detailed ideas for the final convergence.`;

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


