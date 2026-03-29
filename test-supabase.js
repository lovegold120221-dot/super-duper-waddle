// Test Supabase connection
import { supabase } from './src/lib/supabase.js';

async function testConnection() {
  try {
    console.log('Testing Supabase connection...');
    
    // Test if we can access the conversations table
    const { data, error } = await supabase
      .from('conversations')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Connection test failed:', error);
      console.log('This likely means the conversations table doesn\'t exist yet.');
      console.log('Please run the SQL in supabase-schema.sql in your Supabase SQL editor.');
    } else {
      console.log('✅ Supabase connection successful!');
      console.log('Table exists and is accessible.');
    }
  } catch (err) {
    console.error('Connection error:', err);
  }
}

testConnection();
