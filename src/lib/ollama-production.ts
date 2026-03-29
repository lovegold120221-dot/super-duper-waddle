// Production-ready Ollama client with Vercel support
// File: src/lib/ollama-production.ts

export interface AgentTurn {
  name: string;
  role: string;
  prompt: string;
  provider: string;
  modelName: string;
}

export interface TurnContext {
  isFirst: boolean;
  isLast: boolean;
  round?: number;
}

// Production Ollama client that works with Vercel
export class OllamaProductionClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor() {
    // Use Vercel serverless function in production
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? '/api/ollama-proxy' 
      : process.env.OLLAMA_URL || 'http://localhost:11434';
    
    this.apiKey = process.env.OLLAMA_API_KEY;
  }

  async generateResponse(
    agent: AgentTurn,
    topic: string,
    history: Array<{ speaker: string; role: string; text: string }>,
    turnContext: TurnContext,
    options?: any
  ): Promise<string> {
    const prompt = this.buildPrompt(agent, topic, history, turnContext);
    
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
      },
      body: JSON.stringify({
        model: agent.modelName,
        prompt,
        stream: false,
        options: {
          temperature: 0.85,
          top_p: 0.92,
          num_predict: 2500,
          repeat_penalty: 1.1,
          ...options
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.response;
  }

  async *streamResponse(
    agent: AgentTurn,
    topic: string,
    history: Array<{ speaker: string; role: string; text: string }>,
    turnContext: TurnContext,
    signal?: AbortSignal,
    options?: any
  ): AsyncGenerator<string> {
    const prompt = this.buildPrompt(agent, topic, history, turnContext);
    
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
      },
      body: JSON.stringify({
        model: agent.modelName,
        prompt,
        stream: true,
        options: {
          temperature: 0.85,
          top_p: 0.92,
          num_predict: 2500,
          repeat_penalty: 1.1,
          ...options
        }
      }),
      signal
    });

    if (!response.ok || !response.body) {
      throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const text = decoder.decode(value, { stream: true });
        for (const line of text.split('\n')) {
          if (!line.trim()) continue;
          try {
            const json = JSON.parse(line);
            if (json.response) yield json.response;
          } catch { /* partial JSON line */ }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async listModels(): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/api/tags`, {
      headers: {
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    const data = await response.json();
    return data.models || [];
  }

  private buildPrompt(
    agent: AgentTurn,
    topic: string,
    history: Array<{ speaker: string; role: string; text: string }>,
    turnContext: TurnContext
  ): string {
    const historyBlock = history.length > 0
      ? '\n\nDISCUSSION SO FAR:\n' + history.map(h => `[${h.speaker}]: ${h.text}`).join('\n\n')
      : '';

    const turnInstruction = turnContext.isFirst
      ? `Topic for this session: "${topic}". You're leading this meeting. Start with proper introductions and frame the challenge.`
      : turnContext.isLast
      ? `You've heard from the full team on "${topic}". Synthesize the strongest points and make a clear recommendation.`
      : `React to the previous speaker and add your expert take as ${agent.role} on "${topic}". This is round ${turnContext.round || 1}. Keep it to 1-2 sentences with natural expressions.`;

    return `You are ${agent.name}, ${agent.role}.${agent.prompt ? ` Character: ${agent.prompt}` : ''}${historyBlock}

${turnInstruction}

Speak naturally with your characteristic humor and emotions. Use reactions like "*sighs*", "*chuckles*", "*nods thoughtfully*" to make it feel real. Human expert tone. No bullet points.`;
  }
}

// Production streaming function
export async function* streamAgentResponseProduction(
  agent: AgentTurn,
  topic: string,
  history: Array<{ speaker: string; role: string; text: string }>,
  turnContext: TurnContext,
  ollamaUrl: string,
  modelName: string,
  signal?: AbortSignal
): AsyncGenerator<string> {
  const client = new OllamaProductionClient();
  
  // Override model name if provided
  const agentWithModel = { ...agent, modelName: modelName || agent.modelName };
  
  yield* client.streamResponse(agentWithModel, topic, history, turnContext, signal);
}

// Model fetching for production
export async function fetchOllamaModelsProduction(): Promise<any[]> {
  const client = new OllamaProductionClient();
  return client.listModels();
}
