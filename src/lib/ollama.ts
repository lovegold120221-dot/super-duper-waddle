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
  turnContext: { isFirst: boolean; isLast: boolean },
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
• Speak in 2-4 sentences — natural expert spoken voice, NOT writing
• React DIRECTLY to what the previous speaker said
• Use natural speech patterns: "Look,", "Here's the thing —", "Actually,", contractions
• NEVER use bullet points, headers, or markdown formatting
• NEVER start with your own name
• Sound like a human expert with real opinions and stakes`;

  const turnInstruction = turnContext.isFirst
    ? `Topic for this session: "${topic}"\n\nYou're leading this meeting. Open with energy — frame the core challenge, say what the team must focus on, and kick off the discussion. Be direct and confident. 2-4 sentences.`
    : turnContext.isLast
    ? `You've heard from the full team on "${topic}". Synthesize the strongest points, acknowledge the tension, and make a clear decisive recommendation as leader. Close with conviction. 3-5 sentences.`
    : `${history.length > 0 ? `${history[history.length - 1].speaker} just said: "${history[history.length - 1].text.substring(0, 250)}"\n\n` : ''}React to that and add your expert take as ${agent.role} on "${topic}". 2-4 sentences, be specific.`;

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
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      try {
        const json = JSON.parse(line);
        // Skip thinking tokens (qwen3 uses a separate `thinking` field; `response` is empty during thinking)
        if (json.response) yield json.response;
        if (json.done) return;
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


