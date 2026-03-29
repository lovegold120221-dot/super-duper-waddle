// Smart Ollama client that switches between local and production
// File: src/lib/ollama-client.ts

import { streamAgentResponseProduction, fetchOllamaModelsProduction } from './ollama-production';
import { streamAgentResponse, fetchOllamaModels } from './ollama';

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

// Smart client that detects environment
export class SmartOllamaClient {
  private isProduction: boolean;
  private ollamaUrl: string;

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  }

  async *streamAgentResponse(
    agent: AgentTurn,
    topic: string,
    history: Array<{ speaker: string; role: string; text: string }>,
    turnContext: TurnContext,
    ollamaUrl: string,
    modelName: string,
    signal?: AbortSignal
  ): AsyncGenerator<string> {
    if (this.isProduction) {
      console.log('Using production Ollama client');
      yield* streamAgentResponseProduction(agent, topic, history, turnContext, ollamaUrl, modelName, signal);
    } else {
      console.log('Using local Ollama client');
      yield* streamAgentResponse(agent, topic, history, turnContext, ollamaUrl, modelName, signal);
    }
  }

  async fetchModels(): Promise<any[]> {
    if (this.isProduction) {
      console.log('Fetching production Ollama models');
      return fetchOllamaModelsProduction();
    } else {
      console.log('Fetching local Ollama models');
      return fetchOllamaModels();
    }
  }

  getOllamaUrl(): string {
    return this.isProduction ? '/api/ollama-proxy' : this.ollamaUrl;
  }
}

// Export functions that work in both environments
export async function* streamAgentResponseSmart(
  agent: AgentTurn,
  topic: string,
  history: Array<{ speaker: string; role: string; text: string }>,
  turnContext: TurnContext,
  ollamaUrl: string,
  modelName: string,
  signal?: AbortSignal
): AsyncGenerator<string> {
  const client = new SmartOllamaClient();
  yield* client.streamAgentResponse(agent, topic, history, turnContext, ollamaUrl, modelName, signal);
}

export async function fetchOllamaModelsSmart(): Promise<any[]> {
  const client = new SmartOllamaClient();
  return client.fetchModels();
}

export function getOllamaUrlSmart(): string {
  const client = new SmartOllamaClient();
  return client.getOllamaUrl();
}
