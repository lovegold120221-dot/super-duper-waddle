const fs = require('fs');
let code = fs.readFileSync('src/components/Panel.tsx', 'utf8');

// 1. Remove TTS imports
code = code.replace(/import\s+\{\s*generateTTS[^\n]*/g, "import { streamAgentTurnGemini } from '../lib/gemini';");
code = code.replace(/import\s+\{\s*generateQwenTTS[^\n]*/g, '');
code = code.replace(/import\s+\{\s*generateCartesiaTTS[^\n]*/g, '');
code = code.replace(/import\s+\{\s*generateGeminiTTS[^\n]*/g, '');
code = code.replace(/import\s+\{\s*generateVibeVoiceTTS[^\n]*/g, '');
code = code.replace(/import\s+\{\s*generateKokoroTTS[^\n]*/g, '');
code = code.replace(/import\s+\{\s*generateSupertonicTTS[^;]+;/g, '');
code = code.replace(/import\s+\{\s*generateTadaTTS[^\n]*/g, '');
code = code.replace(/import\s+\{\s*generateVoiceboxTTS[^;]+;/g, '');
code = code.replace(/import\s+\{\s*CARTESIA_VOICES[^\n]*/g, '');

// 2. Remove constant arrays related to TTS
code = code.replace(/const GEMINI_VOICES = \[[^\]]+\];\n/g, '');
code = code.replace(/const QWEN_VOICES = \[[^\]]+\];\n/g, '');
// For multi-line arrays like QWEN_VOICES:
code = code.replace(/const QWEN_VOICES = \[\s*\{[\s\S]*?\}\s*\];\n/g, '');
code = code.replace(/const AGENT_DEFAULT_QWEN_VOICES: Record<string, string> = \{[\s\S]*?\};\n/g, '');
code = code.replace(/const AGENT_DEFAULT_CARTESIA_VOICES: Record<string, string> = \{[\s\S]*?\};\n/g, '');
code = code.replace(/const AGENT_SUPERTONIC_VOICES[\s\S]*?\};\n/g, '');

// 3. Update Agent interface
code = code.replace(/voice:\s*string;\n\s*ttsProvider:\s*'[^']+';\n/g, '');
code = code.replace(/voice:\s*string;\n\s*ttsProvider:\s*'[^']+'\s*\|\s*'[^']+'[^;]+;/g, '');
// more robust interface replacement
code = code.replace(/voice: string;\n\s*ttsProvider:[^;]+;/g, '');

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
  code = code.replace(new RegExp(`\\s*const \\[${state},[^\n]+;\n`, 'g'), '');
}
const refsToRemove = [
  'ttsQueueRef', 'ttsPlayingRef', 'audioUnlockedRef', 'qwenTtsUrlRef',
  'tadaTtsUrlRef', 'voiceboxProfilesRef', 'currentAudioRef', 'audioContextRef',
  'isMutedRef', 'cartesiaApiKeyRef'
];
for (const ref of refsToRemove) {
  code = code.replace(new RegExp(`\\s*const ${ref} = useRef[^\n]+;\n`, 'g'), '');
}
// Remove interface TTSQueueItem block
code = code.replace(/\s*\/\/ TTS queue[\s\S]*?ttsQueueRef\.current = \[\];\n/g, '\n');
code = code.replace(/\s*interface TTSQueueItem \{[\s\S]*?\}\n/g, '');

// 6. Remove useEffect blocks for audio and TTS
code = code.replace(/\s*\/\/ Preload Supertonic TTS models[\s\S]*?\}\s*\],\s*\[\]\);\n/g, '');
code = code.replace(/\s*\/\/ Initialize audio context for Chrome autoplay[\s\S]*?\}\s*\],\s*\[\]\);\n/g, '');
code = code.replace(/\s*useEffect\(\(\) => \{ qwenTtsUrlRef\.current[^\n]+/g, '');
code = code.replace(/\s*useEffect\(\(\) => \{ tadaTtsUrlRef\.current[^\n]+/g, '');
code = code.replace(/\s*useEffect\(\(\) => \{ cartesiaApiKeyRef\.current[^\n]+/g, '');
code = code.replace(/\s*useEffect\(\(\) => \{ voiceboxProfilesRef\.current[^\n]+/g, '');
code = code.replace(/\s*useEffect\(\(\) => \{\s*fetchVoiceboxProfiles[\s\S]*?\}\s*\],\s*\[\]\);\n/g, '');
code = code.replace(/\s*if \(currentAudioRef\.current\) \{ currentAudioRef\.current\.pause\(\); currentAudioRef\.current = null; \}\n/g, '');
code = code.replace(/\s*if \(audioContextRef\.current\) audioContextRef\.current\.close\(\);\n/g, '');
code = code.replace(/\s*audioContextRef\.current = null;\n/g, '');

// remove saveCurrentSettings references to TTS
code = code.replace(/\s*qwen_tts_url:[^\n]+/g, '');
code = code.replace(/\s*cartesia_api_key:[^\n]+/g, '');
code = code.replace(/\s*is_muted:[^\n]+/g, '');
code = code.replace(/\s*auto_start_tts:[^\n]+/g, '');

// Handle loadUserSettings references
code = code.replace(/\s*setQwenTtsUrl[^\n]+/g, '');
code = code.replace(/\s*setCartesiaApiKey[^\n]+/g, '');
code = code.replace(/\s*setIsMuted[^\n]+/g, '');


fs.writeFileSync('src/components/Panel.tsx', code, 'utf8');
console.log('Done cleaning basic blocks');
