const fs = require('fs');

function cleanFile(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');

  // 1. Remove TTS imports
  code = code.replace(/import\s*\{\s*generateTTS,\s*streamAgentTurnGemini\s*\}\s*from\s*'..\/lib\/gemini';/g, "import { streamAgentTurnGemini } from '../lib/gemini';");
  code = code.replace(/import\s*\{[^}]*\}\s*from\s*'..\/lib\/qwen-tts';[\r\n]*/g, '');
  code = code.replace(/import\s*\{[^}]*\}\s*from\s*'..\/lib\/cartesia-tts';[\r\n]*/g, '');
  code = code.replace(/import\s*\{[^}]*\}\s*from\s*'..\/lib\/gemini-tts';[\r\n]*/g, '');
  code = code.replace(/import\s*\{[^}]*\}\s*from\s*'..\/lib\/vibevoice-tts';[\r\n]*/g, '');
  code = code.replace(/import\s*\{[^}]*\}\s*from\s*'..\/lib\/kokoro-tts';[\r\n]*/g, '');
  code = code.replace(/import\s*\{[^}]*\}\s*from\s*'..\/lib\/supertonic-tts';[\r\n]*/g, '');
  code = code.replace(/import\s*\{[^}]*\}\s*from\s*'..\/lib\/tada-tts';[\r\n]*/g, '');
  code = code.replace(/import\s*\{[\s\S]*?\}\s*from\s*'..\/lib\/voicebox-tts';[\r\n]*/g, '');
  code = code.replace(/import\s*\{[^}]*\}\s*from\s*'..\/lib\/cartesia-voices';[\r\n]*/g, '');

  // 2. Remove constant arrays related to TTS
  code = code.replace(/const GEMINI_VOICES = \[[^\]]+\];[\r\n]*/g, '');
  code = code.replace(/const QWEN_VOICES = \[\s*(\{[\s\S]*?\},\s*)*\{[\s\S]*?\}\s*\];[\r\n]*/g, '');
  code = code.replace(/const AGENT_DEFAULT_QWEN_VOICES: Record<string, string> = \{[\s\S]*?\};[\r\n]*/g, '');
  code = code.replace(/const AGENT_DEFAULT_CARTESIA_VOICES: Record<string, string> = \{[\s\S]*?\};[\r\n]*/g, '');

  // 3. Update Agent interface
  code = code.replace(/\s*voice:\s*string;[\r\n]*\s*ttsProvider:\s*[^;]+;[\r\n]*/g, '\n');

  // 4. Update defaultAgents
  code = code.replace(/,\s*voice:\s*"[^"]+",\s*ttsProvider:\s*"[^"]+"/g, '');

  // 5. Remove TTS states and refs
  const statesToRemove = [
    'qwenTtsUrl', 'qwenTtsStatus', 'cartesiaApiKey', 'cartesiaStatus',
    'geminiTtsStatus', 'vibevoiceTtsStatus', 'tadaTtsUrl', 'tadaTtsStatus',
    'voiceboxStatus', 'voiceboxProfiles', 'voiceboxMeta', 'voiceboxHistory',
    'speakingAgentName', 'isMuted'
  ];
  for (const state of statesToRemove) {
    code = code.replace(new RegExp(`\\s*const \\[${state},[^\n]+;[\r\n]*`, 'g'), '');
  }
  const refsToRemove = [
    'ttsQueueRef', 'ttsPlayingRef', 'audioUnlockedRef', 'qwenTtsUrlRef',
    'tadaTtsUrlRef', 'voiceboxProfilesRef', 'currentAudioRef', 'audioContextRef',
    'isMutedRef', 'cartesiaApiKeyRef'
  ];
  for (const ref of refsToRemove) {
    code = code.replace(new RegExp(`\\s*const ${ref} = useRef[^\n]+;[\r\n]*`, 'g'), '');
  }

  // Remove interface TTSQueueItem block
  code = code.replace(/\s*\/\/ TTS queue[\s\S]*?ttsQueueRef\.current = \[\];[\r\n]*/g, '\n');
  code = code.replace(/\s*interface TTSQueueItem \{[\s\S]*?\}[\r\n]*/g, '');

  // 6. Remove useEffect blocks for audio and TTS
  code = code.replace(/\s*\/\/ Preload Supertonic TTS models[\s\S]*?\}\s*\],\s*\[\]\);[\r\n]*/g, '');
  code = code.replace(/\s*\/\/ Initialize audio context for Chrome autoplay[\s\S]*?\}\s*\],\s*\[\]\);[\r\n]*/g, '');
  
  // Single line useEffects
  code = code.replace(/\s*useEffect\(\(\) => \{ qwenTtsUrlRef\.current[^\n]+[\r\n]*/g, '');
  code = code.replace(/\s*useEffect\(\(\) => \{ tadaTtsUrlRef\.current[^\n]+[\r\n]*/g, '');
  code = code.replace(/\s*useEffect\(\(\) => \{ cartesiaApiKeyRef\.current[^\n]+[\r\n]*/g, '');
  code = code.replace(/\s*useEffect\(\(\) => \{ voiceboxProfilesRef\.current[^\n]+[\r\n]*/g, '');
  
  // Multi line voicebox profile fetch
  code = code.replace(/\s*useEffect\(\(\) => \{\s*fetchVoiceboxProfiles[\s\S]*?\}\s*\],\s*\[\]\);[\r\n]*/g, '');

  // Audio cleanup in unmount
  code = code.replace(/\s*if \(currentAudioRef\.current\) \{ currentAudioRef\.current\.pause\(\); currentAudioRef\.current = null; \}[\r\n]*/g, '');
  code = code.replace(/\s*if \(audioContextRef\.current\) audioContextRef\.current\.close\(\);[\r\n]*/g, '');
  
  // Stop All TTS function
  code = code.replace(/\s*const stopAllTTS[\s\S]*?\/\/ --- END OF STOP ALL TTS ---[\r\n]*/g, ''); // Need to check if there is an end marker or just regex it. Actually, I can just use AST or string matches if regex fails.
  
  // Actually, wait, let's just do a manual string replace or a more targeted clean.

  // Remove `audioContextRef.current = null;`
  code = code.replace(/\s*audioContextRef\.current = null;[\r\n]*/g, '');

  // remove saveCurrentSettings references to TTS
  code = code.replace(/\s*setQwenTtsUrl\(settings\.qwen_tts_url\);[\r\n]*/g, '');
  code = code.replace(/\s*setCartesiaApiKey\(settings\.cartesia_api_key\);[\r\n]*/g, '');
  code = code.replace(/\s*setIsMuted\(settings\.is_muted\);[\r\n]*/g, '');
  
  code = code.replace(/\s*qwen_tts_url:\s*qwenTtsUrl,[\r\n]*/g, '');
  code = code.replace(/\s*cartesia_api_key:\s*cartesiaApiKey,[\r\n]*/g, '');
  code = code.replace(/\s*is_muted:\s*isMuted,[\r\n]*/g, '');
  code = code.replace(/\s*auto_start_tts:\s*true[\r\n]*/g, '');

  // Remove TTS enqueueing
  code = code.replace(/\s*ttsQueueRef\.current = \[\];[\r\n]*/g, '');
  code = code.replace(/\s*ttsPlayingRef\.current = false;[\r\n]*/g, '');
  
  // Remove stopAllTTS() calls
  code = code.replace(/\s*stopAllTTS\(\);[\r\n]*/g, '');

  // Remove browser audio unlock
  code = code.replace(/\s*\/\/ Unlock browser audio during the user gesture[\s\S]*?catch \{\}[\r\n]*/g, '');

  // Remove the block containing stopAllTTS and other TTS functions
  // Since it's hard to match exact function boundaries with regex, I'll match function signatures and their bodies up to the next known function.
  // Actually I can just write a quick typescript parser using regex balancing if I really need to, but simple string replace is safer. Let's see how much we can clean automatically and then use `edit` or another targeted script.
  
  fs.writeFileSync(filePath, code, 'utf8');
}

cleanFile('src/components/Panel.tsx');
console.log('Cleaned Panel.tsx pass 2');
