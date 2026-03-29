// VibeVoice TTS Server
// Node.js server for VibeVoice integration

export const config = {
  runtime: 'nodejs18',
  maxDuration: 30, // 30 seconds
};

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

// VibeVoice Python script
const VIBEVOICE_SCRIPT = `
import torch
import torchaudio
from transformers import AutoProcessor, VitsModel
import numpy as np
import soundfile as sf
import io
import base64
import json
import sys
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="VibeVoice TTS API")

class TTSRequest(BaseModel):
    text: str
    config: dict = {}

class VoiceConfig(BaseModel):
    model: str = "microsoft/vibe"
    device: str = "cpu"
    sample_rate: int = 22050
    voice: str = "default"
    speed: float = 1.0
    pitch: float = 1.0
    emotion: str = None

# Global model cache
model_cache = {}
processor_cache = {}

def load_model(model_name: str, device: str):
    """Load VibeVoice model with caching"""
    cache_key = f"{model_name}_{device}"
    
    if cache_key not in model_cache:
        logger.info(f"Loading model: {model_name}")
        try:
            processor = AutoProcessor.from_pretrained(model_name)
            model = VitsModel.from_pretrained(model_name)
            
            if device == "cuda" and torch.cuda.is_available():
                model = model.to("cuda")
                logger.info("Model loaded on CUDA")
            else:
                logger.info("Model loaded on CPU")
            
            model_cache[cache_key] = model
            processor_cache[cache_key] = processor
            
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise HTTPException(status_code=500, detail=f"Model loading failed: {e}")
    
    return model_cache[cache_key], processor_cache[cache_key]

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "models_loaded": len(model_cache)}

@app.get("/api/voices")
async def get_voices():
    """Get available voices"""
    return [
        {"id": "default", "name": "Default Voice", "language": "en", "gender": "neutral"},
        {"id": "female-natural", "name": "Natural Female", "language": "en", "gender": "female"},
        {"id": "male-natural", "name": "Natural Male", "language": "en", "gender": "male"},
        {"id": "female-energetic", name: "Energetic Female", "language": "en", "gender": "female"},
        {"id": "male-calm", name: "Calm Male", "language": "en", "gender": "male"},
        {"id": "child-friendly", name: "Child Friendly", "language": "en", "gender": "neutral"},
        {"id": "professional", name: "Professional", "language": "en", "gender": "neutral"},
        {"id": "storyteller", name: "Storyteller", "language": "en", "gender": "neutral"}
    ]

@app.post("/api/tts")
async def text_to_speech(request: TTSRequest):
    """Convert text to speech using VibeVoice"""
    try:
        config = VoiceConfig(**request.config)
        
        # Load model
        model, processor = load_model(config.model, config.device)
        
        # Prepare text
        text = request.text.strip()
        if not text:
            raise HTTPException(status_code=400, detail="Text cannot be empty")
        
        # Generate speech
        with torch.no_grad():
            inputs = processor(text=text, return_tensors="pt")
            
            if config.device == "cuda" and torch.cuda.is_available():
                inputs = {k: v.to("cuda") for k, v in inputs.items()}
            
            # Adjust speech parameters
            speech = model.generate_speech(
                inputs["input_ids"], 
                speaker_embeddings=None,
                vocoder_kwargs={
                    "speed": config.speed,
                    "pitch": config.pitch
                }
            )
            
            # Convert to numpy array
            if isinstance(speech, torch.Tensor):
                speech = speech.cpu().numpy()
            
            # Ensure correct shape and format
            if len(speech.shape) > 1:
                speech = speech.squeeze()
            
            # Convert to bytes
            buffer = io.BytesIO()
            sf.write(buffer, config.sample_rate, speech.astype(np.float32), format='WAV')
            buffer.seek(0)
            
            # Return as base64
            audio_base64 = base64.b64encode(buffer.read()).decode()
            
            return {
                "audio": audio_base64,
                "sample_rate": config.sample_rate,
                "format": "wav"
            }
            
    except Exception as e:
        logger.error(f"TTS generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {e}")

@app.post("/api/tts/stream")
async def text_to_speech_stream(request: TTSRequest):
    """Convert text to speech with streaming"""
    # For now, return the same as non-streaming
    # In a real implementation, you'd implement actual streaming
    return await text_to_speech(request)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
`;

export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET' && req.url === '/health') {
    return res.status(200).json({ status: 'healthy', service: 'vibevoice-tts' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, config = {} } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // For demo purposes, return a mock response
    // In production, this would call the actual VibeVoice Python script
    const mockAudioBase64 = "UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT";
    
    return res.status(200).json({
      audio: mockAudioBase64,
      sample_rate: 22050,
      format: "wav",
      config: {
        model: "microsoft/vibe",
        device: "cpu",
        voice: config.voice || "default"
      }
    });

  } catch (error) {
    console.error('VibeVoice TTS error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
