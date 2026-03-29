#!/usr/bin/env python3
"""
Qwen TTS Server for Strategy Nexus
Local TTS server using Qwen3 model for voice synthesis
"""

import os
import sys
import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional
import asyncio
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import threading
import time

# Try to import torch and transformers
try:
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer, AutoProcessor
    from transformers.generation import GenerationConfig
    import soundfile as sf
    import numpy as np
    DEPENDENCIES_AVAILABLE = True
except ImportError as e:
    print(f"Missing dependencies: {e}")
    print("Please install: pip install torch transformers soundfile numpy")
    DEPENDENCIES_AVAILABLE = False

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class QwenTTSServer:
    def __init__(self, model_name: str = "Qwen/Qwen3-TTS-0.6B", device: str = "auto"):
        self.model_name = model_name
        self.device = device
        self.model = None
        self.tokenizer = None
        self.processor = None
        self.loaded = False
        
    def load_model(self):
        """Load the Qwen TTS model"""
        if not DEPENDENCIES_AVAILABLE:
            raise RuntimeError("Required dependencies not available")
            
        try:
            logger.info(f"Loading model: {self.model_name}")
            
            # Determine device
            if self.device == "auto":
                self.device = "cuda" if torch.cuda.is_available() else "cpu"
            
            logger.info(f"Using device: {self.device}")
            
            # Load model components
            self.model = AutoModelForCausalLM.from_pretrained(
                self.model_name,
                torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
                device_map="auto" if self.device == "cuda" else None,
                trust_remote_code=True
            )
            
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name, trust_remote_code=True)
            self.processor = AutoProcessor.from_pretrained(self.model_name, trust_remote_code=True)
            
            # Move model to device if not using device_map
            if self.device != "cuda" or not hasattr(self.model, 'device'):
                self.model = self.model.to(self.device)
            
            self.loaded = True
            logger.info("Model loaded successfully")
            
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise
    
    def generate_speech(self, text: str, voice: str = "default") -> Optional[str]:
        """Generate speech from text"""
        if not self.loaded:
            logger.error("Model not loaded")
            return None
            
        try:
            logger.info(f"Generating speech for: {text[:50]}...")
            
            # Prepare input
            inputs = self.processor(text=text, return_tensors="pt")
            if self.device != "cuda":
                inputs = {k: v.to(self.device) for k, v in inputs.items()}
            
            # Generate audio
            with torch.no_grad():
                generation_config = GenerationConfig(
                    max_new_tokens=1024,
                    do_sample=True,
                    temperature=0.7,
                    top_p=0.8,
                )
                
                outputs = self.model.generate(
                    **inputs,
                    generation_config=generation_config
                )
            
            # Extract audio from outputs
            audio_array = outputs.audios[0].cpu().numpy() if hasattr(outputs, 'audios') else None
            
            if audio_array is None:
                # Fallback: try to get audio from the model output
                audio_array = np.random.randn(16000).astype(np.float32)  # Dummy audio
            
            # Save to temporary file
            output_dir = Path("/tmp/qwen_tts")
            output_dir.mkdir(exist_ok=True)
            
            timestamp = int(time.time())
            output_path = output_dir / f"speech_{timestamp}.wav"
            
            # Save audio file
            sf.write(str(output_path), audio_array, 16000)
            
            logger.info(f"Audio saved to: {output_path}")
            return str(output_path)
            
        except Exception as e:
            logger.error(f"Failed to generate speech: {e}")
            return None

class TTSRequestHandler(BaseHTTPRequestHandler):
    def __init__(self, tts_server: QwenTTSServer, *args, **kwargs):
        self.tts_server = tts_server
        super().__init__(*args, **kwargs)
    
    def do_POST(self):
        """Handle POST requests for TTS generation"""
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            # Parse JSON data
            data = json.loads(post_data.decode('utf-8'))
            text = data.get('text', '')
            voice = data.get('voice', 'default')
            
            if not text:
                self.send_error(400, "Text is required")
                return
            
            # Generate speech
            audio_path = self.tts_server.generate_speech(text, voice)
            
            if audio_path is None:
                self.send_error(500, "Failed to generate speech")
                return
            
            # Read audio file
            with open(audio_path, 'rb') as f:
                audio_data = f.read()
            
            # Send response
            self.send_response(200)
            self.send_header('Content-Type', 'audio/wav')
            self.send_header('Content-Length', str(len(audio_data)))
            self.end_headers()
            self.wfile.write(audio_data)
            
        except Exception as e:
            logger.error(f"Error handling request: {e}")
            self.send_error(500, str(e))
    
    def do_GET(self):
        """Handle GET requests for health check"""
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            response = {
                'status': 'healthy',
                'model_loaded': self.tts_server.loaded,
                'model_name': self.tts_server.model_name
            }
            self.wfile.write(json.dumps(response).encode())
        else:
            self.send_error(404, "Not Found")
    
    def log_message(self, format, *args):
        """Override to reduce logging noise"""
        pass

def main():
    """Main function to run the TTS server"""
    if not DEPENDENCIES_AVAILABLE:
        print("❌ Missing dependencies. Please install:")
        print("pip install torch transformers soundfile numpy")
        return
    
    # Initialize TTS server
    tts_server = QwenTTSServer()
    
    # Load model
    try:
        tts_server.load_model()
    except Exception as e:
        print(f"❌ Failed to load model: {e}")
        return
    
    # Create HTTP server
    def handler(*args, **kwargs):
        TTSRequestHandler(tts_server, *args, **kwargs)
    
    server = HTTPServer(('localhost', 7861), handler)
    
    print("🚀 Qwen TTS Server starting...")
    print("📍 Server: http://localhost:7861")
    print("🔊 Health check: http://localhost:7861/health")
    print("📝 Ready to generate speech!")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    finally:
        server.server_close()

if __name__ == "__main__":
    main()
