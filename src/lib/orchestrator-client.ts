const ORCHESTRATOR_URL = 'http://localhost:8003';

export interface Session {
  session_id: string;
  topic: string;
  phase: 'waiting' | 'intro' | 'discussion' | 'synthesis' | 'ended';
  current_round: number;
  max_rounds: number;
  agents: string[];
  turn_order: string[];
  current_turn_index: number;
  participation: Record<string, number>;
}

export type TurnStrategy = 'manager_controlled' | 'self_organizing' | 'free_form';

export async function createSession(
  topic: string,
  agents: string[],
  strategy: TurnStrategy = 'self_organizing',
  maxRounds: number = 5
): Promise<{ session_id: string } & Session> {
  const response = await fetch(`${ORCHESTRATOR_URL}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic,
      agents,
      strategy,
      max_rounds: maxRounds
    })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create session: ${response.statusText}`);
  }
  
  return response.json();
}

export async function startSession(sessionId: string): Promise<Session> {
  const response = await fetch(`${ORCHESTRATOR_URL}/sessions/${sessionId}/start`, {
    method: 'POST'
  });
  
  if (!response.ok) {
    throw new Error(`Failed to start session: ${response.statusText}`);
  }
  
  return response.json();
}

export async function getSession(sessionId: string): Promise<Session> {
  const response = await fetch(`${ORCHESTRATOR_URL}/sessions/${sessionId}`);
  
  if (!response.ok) {
    throw new Error(`Failed to get session: ${response.statusText}`);
  }
  
  return response.json();
}

export async function getNextSpeaker(sessionId: string): Promise<{ speaker: string | null; reason?: string }> {
  const response = await fetch(`${ORCHESTRATOR_URL}/sessions/${sessionId}/next-speaker`, {
    method: 'POST'
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get next speaker: ${response.statusText}`);
  }
  
  return response.json();
}

export async function advanceTurn(sessionId: string): Promise<Session> {
  const response = await fetch(`${ORCHESTRATOR_URL}/sessions/${sessionId}/advance`, {
    method: 'POST'
  });
  
  if (!response.ok) {
    throw new Error(`Failed to advance turn: ${response.statusText}`);
  }
  
  return response.json();
}

export async function endSession(sessionId: string): Promise<Session> {
  const response = await fetch(`${ORCHESTRATOR_URL}/sessions/${sessionId}/end`, {
    method: 'POST'
  });
  
  if (!response.ok) {
    throw new Error(`Failed to end session: ${response.statusText}`);
  }
  
  return response.json();
}

export async function checkOrchestratorHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${ORCHESTRATOR_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
