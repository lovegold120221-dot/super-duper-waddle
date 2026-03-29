import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ajcymbyuuboavfeclsgz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ndI6bTaX0bu_38Ib2xR_gQ_pOxiuXCk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Conversation persistence ────────────────────────────────────────────────

export interface ConversationRecord {
  topic: string;
  transcript: string;
  manager_verdict: string;
  user_summary: string;
  todo_list: string;
  approval_gate: string;
  shared_memory: string;
  agents: any[];
}

export async function saveConversation(record: ConversationRecord): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .insert([record])
      .select('id')
      .single();
    if (error) {
      console.error('[Supabase] saveConversation error:', error.message);
      return null;
    }
    return data?.id ?? null;
  } catch (e: any) {
    console.error('[Supabase] saveConversation exception:', e?.message);
    return null;
  }
}

export async function loadConversations(limit = 20): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('id, topic, created_at, user_summary')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

// ─── User settings persistence ────────────────────────────────────────────────

export interface UserSettingsRecord {
  device_id: string;
  ollama_url?: string;
  ollama_default_model?: string;
  qwen_tts_url?: string;
  cartesia_api_key?: string;
  gemini_api_key?: string;
  is_muted?: boolean;
  dark_mode?: boolean;
  auto_start_tts?: boolean;
}

export async function saveUserSettings(settings: UserSettingsRecord): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_settings')
      .upsert([settings], { onConflict: 'device_id' });
    if (error) console.error('[Supabase] saveUserSettings error:', error.message);
  } catch (e: any) {
    console.error('[Supabase] saveUserSettings exception:', e?.message);
  }
}

export async function loadUserSettings(deviceId: string): Promise<UserSettingsRecord | null> {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('device_id', deviceId)
      .single();
    if (error) return null;
    return data ?? null;
  } catch {
    return null;
  }
}

// ─── Stable device ID ────────────────────────────────────────────────────────

export function getDeviceId(): string {
  const KEY = 'strategy_nexus_device_id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = `device_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(KEY, id);
  }
  return id;
}
