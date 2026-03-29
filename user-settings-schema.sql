-- Create user_settings table for Strategy Nexus user preferences
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL UNIQUE, -- Unique identifier for each anonymous user/device
  ollama_url TEXT NOT NULL DEFAULT 'http://localhost:11434',
  ollama_default_model TEXT NOT NULL DEFAULT 'qwen3.5',
  qwen_tts_url TEXT NOT NULL DEFAULT 'http://localhost:7861',
  cartesia_api_key TEXT NOT NULL DEFAULT '',
  gemini_api_key TEXT DEFAULT '',
  is_muted BOOLEAN NOT NULL DEFAULT false,
  dark_mode BOOLEAN NOT NULL DEFAULT true,
  auto_start_tts BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_settings_device_id ON user_settings(device_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_updated_at ON user_settings(updated_at DESC);

-- Add Row Level Security (RLS)
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Allow read access to user's own settings based on device_id
CREATE POLICY "Allow read own settings" ON user_settings FOR SELECT USING (true);

-- Allow insert access (for saving user settings)
CREATE POLICY "Allow insert own settings" ON user_settings FOR INSERT WITH CHECK (true);

-- Allow update access (for updating user settings)
CREATE POLICY "Allow update own settings" ON user_settings FOR UPDATE USING (true);

-- Allow upsert access (for save/update operations)
CREATE POLICY "Allow upsert own settings" ON user_settings FOR ALL USING (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_user_settings_updated_at 
    BEFORE UPDATE ON user_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
