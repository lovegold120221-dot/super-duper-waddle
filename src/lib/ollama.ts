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

export interface TurnContext {
  isFirst: boolean;
  isLast: boolean;
  round: number;       // 1 = opening, 2 = cross-exam, 3 = deep-dive/close
  phase: string;       // 'open' | 'react' | 'challenge' | 'defend' | 'probe' | 'propose' | 'counter' | 'deep-dive' | 'final-take' | 'close'
  maxPredict: number;
  hint?: string;       // Optional per-turn override for the prompt instruction
}

function getPhaseInstruction(
  agent: AgentTurn,
  topic: string,
  history: Array<{ speaker: string; role: string; text: string }>,
  ctx: TurnContext
): string {
  // If a custom hint was provided, use it directly
  if (ctx.hint) return `Topic: "${topic}"\n\n${ctx.hint}`;

  const last = history[history.length - 1];
  const lastText = last ? last.text.substring(0, 280) : '';
  const lastSpeaker = last?.speaker || '';

  switch (ctx.phase) {
    case 'open':
      return `Topic for this session: "${topic}"

You're opening the meeting. Frame the core challenge in 2-3 punchy sentences. Set the energy — give the team something specific and provocative to react to. Be direct. Don't summarize, provoke.`;

    case 'react':
      return `${lastSpeaker} just opened with: "${lastText}"

Your first take — 2-3 SHORT sentences. What immediately jumps out from YOUR area of expertise? What are you already worried about or excited by? Be specific. Be real. One human reaction cue if it fits.`;

    case 'challenge':
      return `${lastSpeaker} said: "${lastText}"

Push back. Find the gap, the flaw, or the dangerous assumption in what they just said. 3-5 sentences. Be direct but collegial — you're not attacking them, you're protecting the project. Specific > general.`;

    case 'defend':
      return `${lastSpeaker} just challenged your position with: "${lastText}"

Respond. Either hold your ground with better evidence, concede the point and pivot, or find the middle. Don't just agree to end the argument — that's intellectually dishonest. 3-5 sentences. Show your reasoning.`;

    case 'probe':
      return `The discussion so far has covered: ${history.slice(-3).map(h => `${h.speaker}: "${h.text.substring(0, 100)}"`).join(' | ')}

Jump in with the angle nobody has addressed yet from YOUR specialty. Ask the sharp question or raise the concern that's been missing. 4-5 sentences. Reference something someone actually said.`;

    case 'propose':
      return `Everyone's had their opening shots. Time to get concrete.

Based on the discussion so far, propose a specific direction. What exactly should the team prioritize and build first? Give it a shape — not "we should be careful," but "here's what I think we actually do." 5-7 sentences. Be specific enough to argue about.`;

    case 'counter':
      return `${lastSpeaker} just proposed: "${lastText}"

Stress-test it. What's the critical constraint or modification that makes this proposal actually work — or fall apart? Don't reject for the sake of it. Make it better, or name exactly what breaks. 5-7 sentences. Be honest.`;

    case 'deep-dive':
      return `We're getting into the weeds now. Good.

This is your moment to go deep on the structural/technical/UX/research problem at the heart of this discussion. What's the specific decision that needs to be locked in before anything else can move forward? What do you know from experience that nobody else in this room knows? 6-8 sentences.`;

    case 'final-take':
      return `We're almost done. Give your final, unambiguous take.

What is the one thing you need the team to commit to from your expertise's perspective — before the manager makes the call? What are you most worried about being ignored? 5-7 sentences. Don't hedge. Be clear.`;

    case 'close':
      return `You've heard everything. Now make the call.

Synthesize the discussion as a leader. Reference the real tensions that surfaced. Be honest about what's being deprioritized. State: (1) the direction you're choosing and why, (2) the first concrete milestone, (3) the biggest risk you're consciously accepting, (4) anything you're cutting from scope for now. Close the room with conviction. 10-14 sentences. This is your moment — be the leader.`;

    default:
      return ctx.isLast
        ? `Synthesize everything and close the meeting decisively. 10-14 sentences.`
        : `${lastSpeaker ? `${lastSpeaker} said: "${lastText}"\n\n` : ''}React and contribute your expert perspective. Be specific.`;
  }
}

const HUMAN_NUANCE_GUIDE = `
HUMAN VOICE & EMOTIONAL NUANCE — this is what makes the conversation feel REAL:

Emotional cues (use at most ONE per turn, only when it genuinely fits the moment):
[laughs] [dry laugh] [sighs] [a little frustrated] [leans forward] [pauses] [thinks] [smirks] [raises an eyebrow] [nods slowly] [shakes head] [genuinely surprised] [a bit impressed]

Humor — use it naturally, not forced:
• Deadpan observation: "Oh great, another 'we'll figure it out later' architecture."
• Self-aware: "And yes, I know I say this every single project, but—"
• Calling it out: "I mean, let's just be honest about what we're actually proposing here."
• Dry: "Ah yes, the classic 'keep it simple' plan that's actually 47 edge cases in a trench coat."
• Warm ribbing: "Echo, I love you, but 'we'll tackle auth in week two' is how week two becomes week nine."

Natural speech patterns that feel human:
• "Okay but — what happens when—"
• "Right, and if what [name] said is true, then we have a bigger problem than—"
• "I love the idea, I genuinely do, but—"
• "Hold on — if we go that route, that means... yeah, that's going to hurt."
• "You're actually right on that. I was wrong. But here's what that changes—"
• "No no no, that's not what I'm saying—"
• Building off someone's exact words: they said "minimal viable," you say "right, but whose definition of viable?"

Reference what specific people said earlier. React to actual words, not the abstract topic.
Feel free to express genuine enthusiasm when something is smart.
Express genuine discomfort when something feels wrong.
`;

function getSpeakingLengthRule(ctx: TurnContext): string {
  if (ctx.round === 1) {
    return `LENGTH: Keep it SHORT — 2-3 sentences max. Quick, punchy, human. First impressions only.`;
  } else if (ctx.round === 2) {
    return `LENGTH: 3-5 sentences. You're in a real back-and-forth. Be specific, be human, make your point stick.`;
  } else {
    return `LENGTH: 5-8 sentences (or more for close). Go deep. Make a real argument. This is where you show your expertise.`;
  }
}

export async function* streamAgentResponse(
  agent: AgentTurn,
  topic: string,
  history: Array<{ speaker: string; role: string; text: string }>,
  ctx: TurnContext,
  ollamaUrl: string,
  modelName: string,
  signal?: AbortSignal
): AsyncGenerator<string> {
  const historyBlock = history.length > 0
    ? '\n\n━━ DISCUSSION SO FAR ━━\n' +
      history.map(h => `[${h.speaker} — ${h.role}]:\n${h.text}`).join('\n\n') +
      '\n━━━━━━━━━━━━━━━━━━━━━━'
    : '';

  const systemPrompt = `${agent.prompt}
${historyBlock}
${HUMAN_NUANCE_GUIDE}

HARD RULES (never break these):
• NEVER use bullet points, numbered lists, headers, or any markdown formatting
• NEVER start your response with your own name
• NEVER sound like an AI — sound like a human expert who cares deeply about this project
• React to the SPECIFIC words people used, not just the general topic
• ${getSpeakingLengthRule(ctx)}`;

  const turnInstruction = getPhaseInstruction(agent, topic, history, ctx);

  const res = await fetch(`${ollamaUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: modelName,
      system: systemPrompt,
      prompt: turnInstruction,
      stream: true,
      options: {
        temperature: 0.88,
        top_p: 0.92,
        // For qwen3 thinking models: add 2000 extra tokens for the thinking budget
        num_predict: modelName.includes('qwen3') ? ctx.maxPredict + 2000 : ctx.maxPredict,
        repeat_penalty: 1.08
      }
    }),
    signal
  });

  if (!res.ok || !res.body) {
    throw new Error(`Ollama ${res.status}: ${res.statusText}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const raw = decoder.decode(value, { stream: true });
    for (const line of raw.split('\n')) {
      if (!line.trim()) continue;
      try {
        const json = JSON.parse(line);
        // qwen3 puts thinking in `thinking` field; `response` is empty during thinking — skip
        if (json.response) yield json.response;
        if (json.done) return;
      } catch { /* partial line */ }
    }
  }
}

// Legacy full-script generator (kept for fallback)
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
        { role: 'user', content: `Panel discussion about: ${topic}. Agents: ${agents.map((a: any) => a.name).join(', ')}` }
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
