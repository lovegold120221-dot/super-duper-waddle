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
  round: number;       // 1-5
  phase: string;       // 'open' | 'react' | 'challenge' | 'defend' | 'probe' | 'propose' | 'counter' | 'deep-dive' | 'final-take' | 'close' | 'contemplate'
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

You're opening the meeting. Frame the core challenge with energy and provocation in 3 punchy sentences. Tell the team what's at stake and what you need the meeting to decide. Be direct, be human, set the tone.`;

    case 'contemplate':
      return `The team has just finished a round. Think out loud for a moment — 1-2 sentences of the manager processing what they just heard. You might note a tension, a surprise, or something you didn't expect. Keep it brief, human, candid.`;

    case 'react':
      return `${lastSpeaker} just said: "${lastText}"

Your immediate gut reaction — 3 sentences. What jumps out from YOUR expertise? What are you excited about, worried about, or flat-out skeptical of? Lead with a human opener or reaction sound. Be specific to their words.`;

    case 'challenge':
      return `${lastSpeaker} said: "${lastText}"

Push back. Find the gap or dangerous assumption in exactly what they said. 3-4 sentences. Quote their words if it helps land the challenge. Be direct but not cruel — you're protecting the project, not attacking the person.`;

    case 'defend':
      return `${lastSpeaker} just challenged with: "${lastText}"

Respond. Hold your ground with better evidence, concede and pivot, or find the middle — but don't just agree to end the argument. That's intellectually dishonest. 3-5 sentences. Show your reasoning and feel it.`;

    case 'probe':
      return `You've been listening. The room has covered: ${history.slice(-4).map(h => `${h.speaker}: "${h.text.substring(0, 80)}"`).join(' | ')}

Jump in with the angle nobody's addressed yet from YOUR specialty. Ask the sharp question or raise the missing concern. 4-5 sentences. Reference something someone actually said.`;

    case 'propose':
      return `The discussion has been circling long enough. Time to get concrete.

Propose a specific direction — not "we should be careful" but "here is exactly what we do." What gets built first and why? What gets cut? 5-6 sentences. Be specific enough to argue about.`;

    case 'counter':
      return `${lastSpeaker} just proposed: "${lastText}"

Stress-test it. What's the constraint or condition that makes this proposal work — or fall apart? Don't reject for drama. Make it better, or name exactly what breaks. 4-5 sentences. Be honest.`;

    case 'deep-dive':
      return `We're in the thick of it now. Good.

Go deep on the structural/technical/UX/research problem at the core of this discussion. What's the specific decision that must be locked in before anything else moves? What do you know from experience that nobody else in this room knows? 5-6 sentences.`;

    case 'final-take':
      return `We're wrapping up. Give your final, unambiguous position.

What's the one thing the team must commit to from your perspective before the manager decides? What are you most worried about being ignored or cut? 4-5 sentences. No hedging. Be clear and specific.`;

    case 'close':
      return `You've heard everything. Now make the call and close the room.

As the leader: synthesize the real tensions that surfaced, be honest about what's being deprioritized, and state clearly: (1) the direction you're choosing and why, (2) the first concrete deliverable, (3) the biggest conscious risk you're accepting, (4) what's being cut or pushed to later. End with numbered action items — be specific and implementation-ready. This should feel like a real leader closing a real meeting. 12-14 sentences minimum.`;

    default:
      return ctx.isLast
        ? `Synthesize everything and close the meeting decisively. 10-14 sentences.`
        : `${lastSpeaker ? `${lastSpeaker} said: "${lastText}"\n\n` : ''}React and contribute your expert perspective. Be specific.`;
  }
}

const HUMAN_NUANCE_GUIDE = `
HUMAN VOICE & EMOTIONAL NUANCE — this is what makes the conversation feel REAL:

Emotional reaction sounds (drop these in SPARINGLY — max one per turn, only when it lands naturally):
"Hm." / "Hah." / "Hmpf." / "Ugh." / "Yep." / "Yeah." / "Ahh." / "Ooh." / "Whoa." / "Okay." / "Right." / "Huh." / "Ha!" / "Mmm." / "Yup."

Emotional cues in brackets (ONE max per turn, only if it genuinely fits):
[laughs] [dry laugh] [sighs] [exhales] [a little frustrated] [leans forward] [pauses] [thinks for a second] [smirks] [raises an eyebrow] [nods slowly] [shakes head] [genuinely surprised] [a bit impressed] [slightly alarmed] [amused] [eye-roll energy] [gets animated] [deadpan] [can't help laughing] [chuckles]

Humor — use it to break tension, NOT as filler:
• Deadpan: "Oh great, another 'we'll figure it out in week two' plan."
• Self-aware: "And yes, I know I say this every single project, but —"
• Dry observation: "Ah yes, 'keep it simple' — the plan that's secretly 47 edge cases in a trench coat."
• Warm ribbing (use a colleague's name): "Echo, I love you, but 'we'll tackle auth in week two' is how week two becomes week nine."
• Calling the obvious: "I mean, let's just be honest about what we're actually proposing here."
• Timing beat: "...okay. Okay. Yeah, I heard it too."

Natural openers that sound human — pick what fits your energy:
"Okay look —" / "Here's the thing —" / "Actually, wait —" / "Right, so —" / "Hold on —" / "To be honest," / "I hear you, but —" / "No no no, that's not —" / "That's fair, and also —" / "I love the idea, genuinely, but —" / "Yeah, and that's exactly my problem with it." / "Okay but what happens when —" / "I've seen this before and —"

React to ACTUAL WORDS people used — not the abstract topic. Quote them. Build on them.
Express real enthusiasm when something is smart.
Express real discomfort when something feels wrong.
You can be wrong, and you can change your mind mid-turn if new reasoning hits you.
`;

// Additional utility: generate a structured todo list from the completed discussion
export async function generateStructuredTodo(
  topic: string,
  transcript: string,
  managerVerdict: string,
  ollamaUrl: string,
  modelName: string
): Promise<{ todoList: string; userSummary: string; approvalGate: string }> {
  const prompt = `You just concluded a development planning meeting about: "${topic}"

MANAGER'S CLOSING VERDICT:
${managerVerdict}

DISCUSSION SUMMARY:
${transcript.slice(0, 3000)}

Now produce three things:

1. USER_SUMMARY: One paragraph (3-4 sentences) that explains the chosen direction clearly, as if briefing someone who wasn't in the room.

2. TODO_LIST: A structured, implementation-ready task list organized into phases. Each item should be specific enough to assign to a developer. Format:
PHASE 1 — [Name]:
- [task]
- [task]
PHASE 2 — [Name]:
- [task]
...

3. APPROVAL_GATE: One sentence that makes clear execution begins only after user review and approval.

Respond with exactly these three labeled sections. No markdown headers, just the labels USER_SUMMARY:, TODO_LIST:, APPROVAL_GATE:`;

  try {
    const res = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelName,
        prompt,
        stream: false,
        options: { temperature: 0.5, num_predict: 800 }
      })
    });
    if (!res.ok) throw new Error(`Ollama ${res.status}`);
    const json = await res.json();
    const raw: string = json.response || '';

    const extract = (label: string): string => {
      const idx = raw.indexOf(label);
      if (idx === -1) return '';
      const after = raw.slice(idx + label.length).trim();
      const nextLabel = ['USER_SUMMARY:', 'TODO_LIST:', 'APPROVAL_GATE:']
        .filter(l => l !== label)
        .map(l => after.indexOf(l))
        .filter(i => i > 0)
        .sort((a, b) => a - b)[0];
      return nextLabel !== undefined ? after.slice(0, nextLabel).trim() : after.trim();
    };

    return {
      userSummary: extract('USER_SUMMARY:') || managerVerdict.slice(0, 300),
      todoList: extract('TODO_LIST:') || 'See manager verdict above.',
      approvalGate: extract('APPROVAL_GATE:') || 'This plan is proposed. Execution begins after Commander approval.',
    };
  } catch {
    return {
      userSummary: managerVerdict.slice(0, 300),
      todoList: 'Todo list generation failed — see manager verdict.',
      approvalGate: 'Execution begins after Commander approval.',
    };
  }
}

function getSpeakingLengthRule(ctx: TurnContext): string {
  if (ctx.phase === 'contemplate') {
    return `LENGTH: This is a brief manager aside — 1-2 sentences of thinking aloud. Very short. Contemplative.`;
  }
  if (ctx.round === 1) {
    return `LENGTH: 3 sentences max. Sharp opener — one hot take, one concern or excitement, one thing you want answered. No fluff.`;
  } else if (ctx.round === 2) {
    return `LENGTH: 3-4 sentences. Direct response to what was just said. Quote someone if it helps. Make your point stick.`;
  } else if (ctx.round === 3) {
    return `LENGTH: 4-5 sentences. Build a real argument. Reference earlier discussion. Go deeper than your opening.`;
  } else if (ctx.round === 4) {
    return `LENGTH: 5-6 sentences. Full argument. Go into specifics. Challenge, defend, or narrow. This is the real work.`;
  } else {
    return `LENGTH: 4-5 sentences for specialists. For manager close: 10-14 sentences covering decision, todo items, risks, and next steps.`;
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
