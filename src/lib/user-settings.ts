import { supabase } from './supabase';

// Generate or get device ID for anonymous user
const getDeviceId = (): string => {
  const storageKey = 'strategy-nexus-device-id';
  let deviceId = localStorage.getItem(storageKey);
  
  if (!deviceId) {
    // Generate a unique device ID
    deviceId = 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    localStorage.setItem(storageKey, deviceId);
  }
  
  return deviceId;
};

export interface UserSettings {
  id?: string;
  device_id: string;
  ollama_url: string;
  ollama_default_model: string;
  gemini_api_key?: string;
  dark_mode: boolean;
  created_at?: string;
  updated_at?: string;
}

export async function saveUserSettings(settings: Omit<UserSettings, 'id' | 'created_at' | 'updated_at'>) {
  try {
    const deviceId = getDeviceId();
    
    // Upsert settings for this device (update if exists, insert if not)
    const { data, error } = await supabase
      .from('user_settings')
      .upsert([{
        ...settings,
        device_id: deviceId,
        updated_at: new Date().toISOString()
      }], { onConflict: 'device_id' })
      .select()
      .single();

    if (error) {
      console.error('Error saving user settings:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error saving user settings:', error);
    return null;
  }
}

export async function getUserSettings(): Promise<UserSettings | null> {
  try {
    const deviceId = getDeviceId();
    
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('device_id', deviceId)
      .single();

    if (error) {
      // If no settings exist yet for this device, return null
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching user settings:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching user settings:', error);
    return null;
  }
}

export async function updateUserSettings(updates: Partial<UserSettings>) {
  try {
    const deviceId = getDeviceId();
    
    const { data, error } = await supabase
      .from('user_settings')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('device_id', deviceId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user settings:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error updating user settings:', error);
    return null;
  }
}

export async function getAllDeviceSettings(): Promise<UserSettings[]> {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching all device settings:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching all device settings:', error);
    return [];
  }
}

export { getDeviceId };
