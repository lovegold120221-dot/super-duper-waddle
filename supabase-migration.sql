-- Migration: Add RLS policies and trigger to existing tables
-- Run this in your Supabase SQL editor

-- ============================================
-- USER SETTINGS - RLS + TRIGGER
-- ============================================

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read own settings" ON user_settings;
CREATE POLICY "Allow read own settings" ON user_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert own settings" ON user_settings;
CREATE POLICY "Allow insert own settings" ON user_settings FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update own settings" ON user_settings;
CREATE POLICY "Allow update own settings" ON user_settings FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow upsert own settings" ON user_settings;
CREATE POLICY "Allow upsert own settings" ON user_settings FOR ALL USING (true);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at 
    BEFORE UPDATE ON user_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DISCUSSIONS - RLS
-- ============================================

ALTER TABLE discussions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read discussions" ON discussions;
CREATE POLICY "Allow read discussions" ON discussions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert discussions" ON discussions;
CREATE POLICY "Allow insert discussions" ON discussions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update discussions" ON discussions;
CREATE POLICY "Allow update discussions" ON discussions FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow delete discussions" ON discussions;
CREATE POLICY "Allow delete discussions" ON discussions FOR DELETE USING (true);

-- ============================================
-- CONVERSATIONS - RLS
-- ============================================

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access" ON conversations;
CREATE POLICY "Allow read access" ON conversations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert access" ON conversations;
CREATE POLICY "Allow insert access" ON conversations FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete access" ON conversations;
CREATE POLICY "Allow delete access" ON conversations FOR DELETE USING (true);
