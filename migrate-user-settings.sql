-- Migration script to add device_id to existing user_settings table
-- Run this in your Supabase SQL editor

-- Step 1: Add device_id column (allow NULL initially to avoid conflicts with existing data)
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS device_id TEXT;

-- Step 2: Update existing rows to have a device_id (generate unique ones for existing data)
UPDATE user_settings 
SET device_id = 'device_legacy_' || id::text || '_' || EXTRACT(EPOCH FROM NOW())::text
WHERE device_id IS NULL;

-- Step 3: Make device_id NOT NULL and UNIQUE
ALTER TABLE user_settings ALTER COLUMN device_id SET NOT NULL;
ALTER TABLE user_settings ADD CONSTRAINT user_settings_device_id_unique UNIQUE (device_id);

-- Step 4: Add index for performance
CREATE INDEX IF NOT EXISTS idx_user_settings_device_id ON user_settings(device_id);

-- Step 5: Update RLS policies to use device_id
DROP POLICY IF EXISTS "Allow read access" ON user_settings;
DROP POLICY IF EXISTS "Allow insert access" ON user_settings;
DROP POLICY IF EXISTS "Allow update access" ON user_settings;
DROP POLICY IF EXISTS "Allow upsert access" ON user_settings;

-- Create new policies based on device_id
CREATE POLICY "Allow read own settings" ON user_settings FOR SELECT USING (true);
CREATE POLICY "Allow insert own settings" ON user_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update own settings" ON user_settings FOR UPDATE USING (true);
CREATE POLICY "Allow upsert own settings" ON user_settings FOR ALL USING (true);

-- Step 6: Verify the migration
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'user_settings' 
ORDER BY ordinal_position;
