import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcymbyuuboavfeclsgz.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || 'sb_publishable_ndI6bTaX0bu_38Ib2xR_gQ_pOxiuXCk'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
