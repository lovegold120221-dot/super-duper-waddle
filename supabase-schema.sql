-- Create conversations table for Strategy Nexus
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  topic TEXT NOT NULL,
  transcript TEXT NOT NULL,
  manager_verdict TEXT NOT NULL,
  user_summary TEXT NOT NULL,
  todo_list TEXT NOT NULL,
  approval_gate TEXT NOT NULL,
  shared_memory TEXT NOT NULL,
  agents TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_topic ON conversations USING gin(to_tsvector('english', topic));

-- Add Row Level Security (RLS)
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Allow read access to all conversations (for demo purposes)
-- In production, you might want to restrict this based on user authentication
CREATE POLICY "Allow read access" ON conversations FOR SELECT USING (true);

-- Allow insert access (for saving conversations)
CREATE POLICY "Allow insert access" ON conversations FOR INSERT WITH CHECK (true);

-- Allow delete access (for managing conversations)
CREATE POLICY "Allow delete access" ON conversations FOR DELETE USING (true);
