#!/usr/bin/env node

// Test all TTS providers
import { generateQwenTTS, checkQwenHealth } from './src/lib/qwen-tts.js';
import { generateCartesiaTTS, checkCartesiaKey } from './src/lib/cartesia-tts.js';
import { generateGeminiTTS, checkGeminiKey } from './src/lib/gemini-tts.js';

async function testAllTTS() {
  console.log('🧪 Testing all TTS providers...\n');

  // Test Qwen TTS
  console.log('📞 Testing Qwen TTS...');
  try {
    const qwenHealthy = await checkQwenHealth();
    console.log(`   Health: ${qwenHealthy ? '✅' : '❌'}`);
    
    if (qwenHealthy) {
      const qwenAudio = await generateQwenTTS('Hello, this is a test of Qwen TTS', 'Aaron');
      console.log(`   Generation: ${qwenAudio ? '✅' : '❌'} ${qwenAudio ? `(${qwenAudio.length} chars)` : ''}`);
    }
  } catch (error) {
    console.log(`   Error: ❌ ${error.message}`);
  }

  // Test Cartesia TTS
  console.log('\n🎙️ Testing Cartesia TTS...');
  try {
    const cartesiaKey = process.env.CARTESIA_API_KEY || 'sk_car_zXkapw9X8CycqEWfebGaEf';
    const cartesiaHealthy = await checkCartesiaKey(cartesiaKey);
    console.log(`   Health: ${cartesiaHealthy ? '✅' : '❌'}`);
    
    if (cartesiaHealthy) {
      const cartesiaAudio = await generateCartesiaTTS('Hello, this is a test of Cartesia TTS', '1ec736fa-db96-4eea-9299-235ce2cb7a0e', cartesiaKey);
      console.log(`   Generation: ${cartesiaAudio ? '✅' : '❌'} ${cartesiaAudio ? `(${cartesiaAudio.length} chars)` : ''}`);
    }
  } catch (error) {
    console.log(`   Error: ❌ ${error.message}`);
  }

  // Test Gemini TTS
  console.log('\n☁️ Testing Gemini TTS...');
  try {
    const geminiHealthy = await checkGeminiKey();
    console.log(`   Health: ${geminiHealthy ? '✅' : '❌'}`);
    
    if (geminiHealthy) {
      const geminiAudio = await generateGeminiTTS('Hello, this is a test of Gemini TTS', 'Orus');
      console.log(`   Generation: ${geminiAudio ? '✅' : '❌'} ${geminiAudio ? `(${geminiAudio.length} chars)` : ''}`);
    }
  } catch (error) {
    console.log(`   Error: ❌ ${error.message}`);
  }

  console.log('\n🎯 TTS testing complete!');
}

testAllTTS().catch(console.error);
