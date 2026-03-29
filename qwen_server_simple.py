#!/usr/bin/env python3
"""
Simple Qwen3-TTS-0.6B Server for Strategy Nexus
A basic TTS server that generates dummy audio for testing
"""

import json
import logging
import time
import numpy as np
import soundfile as sf
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SimpleTTSServer:
    def __init__(self):
        self.output_dir = Path("/tmp/qwen_tts")
        self.output_dir.mkdir(exist_ok=True)
        self.model_name = "Qwen/Qwen3-TTS-0.6B"
        
    def generate_speech(self, text: str, voice: str = "default") -> str:
        """Generate dummy speech from text using Qwen3-TTS-0.6B"""
        try:
            logger.info(f"Qwen3-TTS-0.6B generating speech for: {text[:50]}...")
            logger.info(f"Voice profile: {voice}")
            
            # Generate simple sine wave audio as placeholder for Qwen3-TTS-0.6B
            sample_rate = 16000
            duration = min(len(text) * 0.1, 5.0)  # 0.1s per character, max 5s
            t = np.linspace(0, duration, int(sample_rate * duration))
            
            # Create a simple tone with some variation based on voice
            frequency = 440 + (hash(voice) % 100)  # Different frequency per voice
            audio = 0.3 * np.sin(2 * np.pi * frequency * t)
            
            # Add some envelope to make it sound more natural
            envelope = np.exp(-t * 0.5)
            audio = audio * envelope
            
            # Save to temporary file
            timestamp = int(time.time())
            output_path = self.output_dir / f"qwen3_tts_0_6b_{timestamp}.wav"
            
            # Save audio file
            sf.write(str(output_path), audio, sample_rate)
            
            logger.info(f"Qwen3-TTS-0.6B audio saved to: {output_path}")
            return str(output_path)
            
        except Exception as e:
            logger.error(f"Failed to generate Qwen3-TTS-0.6B speech: {e}")
            return None

class TTSRequestHandler(BaseHTTPRequestHandler):
    def __init__(self, tts_server: SimpleTTSServer, *args, **kwargs):
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
            
            # Generate speech using Qwen3-TTS-0.6B
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
                'model': 'Qwen3-TTS-0.6B',
                'server': 'Simple Qwen3-TTS-0.6B Server',
                'voices': ['Aaron', 'Chelsie', 'Brenda', 'Damon', 'Elena', 'Felix', 'Grace', 'Henry', 'Isla', 'Jack', 'Kate', 'Liam']
            }
            self.wfile.write(json.dumps(response).encode())
        else:
            self.send_error(404, "Not Found")
    
    def log_message(self, format, *args):
        """Override to reduce logging noise"""
        pass

def main():
    """Main function to run the Qwen3-TTS-0.6B server"""
    # Initialize TTS server
    tts_server = SimpleTTSServer()
    
    # Create HTTP server
    def handler(*args, **kwargs):
        TTSRequestHandler(tts_server, *args, **kwargs)
    
    server = HTTPServer(('localhost', 7861), handler)
    
    print("🚀 Qwen3-TTS-0.6B Server starting...")
    print("📍 Server: http://localhost:7861")
    print("🔊 Health check: http://localhost:7861/health")
    print("📝 Ready to generate speech with Qwen3-TTS-0.6B!")
    print("⚠️  Using placeholder audio (install full dependencies for real TTS)")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    finally:
        server.server_close()

if __name__ == "__main__":
    main()
