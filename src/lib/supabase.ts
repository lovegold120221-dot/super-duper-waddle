import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcymbyuuboavfeclsgz.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || 'sb_publishable_ndI6bTaX0bu_38Ib2xR_gQ_pOxiuXCk'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Ensures that the user is authenticated anonymously with Supabase.
 * This is required if RLS policies are active and permit only authenticated users.
 */
export async function ensureAuthenticated() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session) {
      return session.user
    }
    
    const { data, error } = await supabase.auth.signInAnonymously()
    
    if (error) {
      console.error('Error signing in anonymously:', error)
      return null
    }
    
    return data.user
  } catch (error) {
    console.error('Supabase authentication failed:', error)
    return null
  }
}

/**
 * Helper to get the current session.
 */
export async function getCurrentSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export interface Conversation {
  id?: string
  topic: string
  transcript: string
  manager_verdict: string
  user_summary: string
  todo_list: string
  approval_gate: string
  shared_memory: string
  agents: string[]
  created_at?: string
}

export async function saveConversation(conversation: Omit<Conversation, 'id' | 'created_at'>) {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .insert([conversation])
      .select()

    if (error) {
      console.error('Error saving conversation:', error)
      return null
    }

    return data?.[0] || null
  } catch (error) {
    console.error('Error saving conversation:', error)
    return null
  }
}

export async function getConversations(limit: number = 10) {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching conversations:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching conversations:', error)
    return []
  }
}

export async function getConversation(id: string) {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching conversation:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error fetching conversation:', error)
    return null
  }
}

export async function deleteConversation(id: string) {
  try {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting conversation:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error deleting conversation:', error)
    return false
  }
}

// ─── Discussion History (hybrid Supabase + localStorage) ────────────────────

const DISCUSSIONS_STORAGE_KEY = 'strategy-nexus-discussions';

export interface DiscussionMessage {
  id: string
  sender: string
  text: string
  type: 'system-msg' | 'agent-message' | 'user-message'
  colorHex?: string
  isFinalPlan?: boolean
}

export interface Discussion {
  id: string
  title: string
  topic: string
  timestamp: string
  messageCount: number
  preview: string
  messages: DiscussionMessage[]
  agents: Array<{ name: string; role: string; hex: string }>
}

// Track whether Supabase discussions table is available
let supabaseDiscussionsAvailable: boolean | null = null;

/**
 * Test if the 'discussions' table exists in Supabase.
 * Caches the result after the first call.
 */
async function checkDiscussionsTable(): Promise<boolean> {
  if (supabaseDiscussionsAvailable !== null) return supabaseDiscussionsAvailable;
  try {
    const { error } = await supabase
      .from('discussions')
      .select('id')
      .limit(1);
    supabaseDiscussionsAvailable = !error;
    if (error) {
      console.info('Supabase discussions table not available, using localStorage:', error.message);
    }
  } catch {
    supabaseDiscussionsAvailable = false;
  }
  return supabaseDiscussionsAvailable;
}

/** Read discussions from localStorage */
function getLocalDiscussions(): Discussion[] {
  try {
    const raw = localStorage.getItem(DISCUSSIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Write discussions to localStorage */
function setLocalDiscussions(discussions: Discussion[]): void {
  try {
    localStorage.setItem(DISCUSSIONS_STORAGE_KEY, JSON.stringify(discussions));
  } catch (e) {
    console.warn('Failed to save discussions to localStorage:', e);
  }
}

/**
 * Load all saved discussions. Tries Supabase first, falls back to localStorage.
 */
export async function loadDiscussions(limit: number = 50): Promise<Discussion[]> {
  const hasTable = await checkDiscussionsTable();
  if (hasTable) {
    try {
      const { data, error } = await supabase
        .from('discussions')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (!error && data) {
        // Also sync to localStorage as cache
        const discussions = data as Discussion[];
        setLocalDiscussions(discussions);
        return discussions;
      }
    } catch (e) {
      console.warn('Supabase load failed, falling back to localStorage:', e);
    }
  }
  return getLocalDiscussions();
}

/**
 * Save or update a discussion. Writes to both Supabase (if available) and localStorage.
 */
export async function saveDiscussion(discussion: Discussion): Promise<void> {
  // Always update localStorage immediately for responsiveness
  const local = getLocalDiscussions();
  const updated = [discussion, ...local.filter(d => d.id !== discussion.id)];
  setLocalDiscussions(updated);

  // Try Supabase in background
  const hasTable = await checkDiscussionsTable();
  if (hasTable) {
    try {
      await supabase
        .from('discussions')
        .upsert([{
          id: discussion.id,
          title: discussion.title,
          topic: discussion.topic,
          timestamp: discussion.timestamp,
          message_count: discussion.messageCount,
          preview: discussion.preview,
          messages: discussion.messages,
          agents: discussion.agents,
        }], { onConflict: 'id' });
    } catch (e) {
      console.warn('Supabase save failed (localStorage still saved):', e);
    }
  }
}

/**
 * Delete a discussion by ID from both Supabase and localStorage.
 */
export async function deleteDiscussionById(id: string): Promise<void> {
  // Always remove from localStorage immediately
  const local = getLocalDiscussions();
  setLocalDiscussions(local.filter(d => d.id !== id));

  // Try Supabase in background
  const hasTable = await checkDiscussionsTable();
  if (hasTable) {
    try {
      await supabase
        .from('discussions')
        .delete()
        .eq('id', id);
    } catch (e) {
      console.warn('Supabase delete failed (localStorage still updated):', e);
    }
  }
}
