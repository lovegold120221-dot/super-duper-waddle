#!/usr/bin/env python3
"""
TADA TTS Server for Strategy Nexus
Uses Hume AI's TADA (Text-Acoustic Dual Alignment) model for high-quality TTS.
https://github.com/HumeAI/tada

Requires:
    pip install hume-tada torch torchaudio soundfile

Models are downloaded on first run from HuggingFace:
    - HumeAI/tada-1b  (encoder: HumeAI/tada-codec)

You must accept the Llama 3.2 license on HuggingFace before downloading:
    https://huggingface.co/meta-llama/Llama-3.2-1B

Reference voices are loaded from ./tada_voices/<voice_name>.wav
A default reference (ljspeech) is bundled with the TADA package.
"""

import io
import json
import logging
import os
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

import soundfile as sf
import torch
import torchaudio

from tada.modules.encoder import Encoder, EncoderOutput
from tada.modules.tada import TadaForCausalLM

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)

PORT = 7862
MODEL_ID = "HumeAI/tada-1b"
CODEC_ID = "HumeAI/tada-codec"
VOICES_DIR = Path(__file__).parent / "tada_voices"

# Voice definitions — each maps to a reference WAV file in tada_voices/
VOICE_CATALOG = [
    {"id": "orion",   "name": "Orion",   "desc": "Male, neutral (default reference)"},
    {"id": "lyra",    "name": "Lyra",    "desc": "Female, warm tone"},
    {"id": "calder",  "name": "Calder",  "desc": "Male, deep voice"},
    {"id": "seren",   "name": "Seren",   "desc": "Female, clear tone"},
    {"id": "caspian", "name": "Caspian", "desc": "Male, authoritative"},
    {"id": "nova",    "name": "Nova",    "desc": "Female, bright tone"},
    {"id": "remy",    "name": "Remy",    "desc": "Male, calm voice"},
    {"id": "wren",    "name": "Wren",    "desc": "Female, gentle tone"},
]
VOICE_IDS = {v["id"] for v in VOICE_CATALOG}

# Locate the bundled ljspeech sample that ships with the tada package
_TADA_PKG_DIR = Path(__file__).parent / "tada" / "samples"
DEFAULT_REFERENCE_WAV = _TADA_PKG_DIR / "ljspeech.wav"
DEFAULT_REFERENCE_TEXT = (
    "The examination and testimony of the experts enabled the commission to "
    "conclude that five shots may have been fired."
)


def _get_device() -> str:
    if torch.cuda.is_available():
        return "cuda"
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return "mps"
    return "cpu"


class TadaServer:
    def __init__(self):
        self.device = _get_device()
        logger.info(f"Loading TADA on device: {self.device}")

        dtype = torch.bfloat16 if self.device in ("cuda", "mps") else torch.float32

        self.encoder = (
            Encoder.from_pretrained(CODEC_ID, subfolder="encoder").to(self.device)
        )
        self.model = (
            TadaForCausalLM.from_pretrained(MODEL_ID, torch_dtype=dtype).to(self.device)
        )

        # Pre-cache prompt encodings for each voice reference
        self._prompt_cache: dict[str, EncoderOutput] = {}
        self._ensure_voices_dir()
        self._preload_voice_cache()

        logger.info("TADA server ready ✓")

    def _ensure_voices_dir(self):
        VOICES_DIR.mkdir(exist_ok=True)
        # Seed orion from the bundled ljspeech sample if not present
        orion_path = VOICES_DIR / "orion.wav"
        if not orion_path.exists() and DEFAULT_REFERENCE_WAV.exists():
            import shutil
            shutil.copy(DEFAULT_REFERENCE_WAV, orion_path)
            logger.info(f"Seeded orion.wav from bundled ljspeech sample")

    def _preload_voice_cache(self):
        for voice in VOICE_CATALOG:
            wav_path = VOICES_DIR / f"{voice['id']}.wav"
            if wav_path.exists():
                try:
                    audio, sr = torchaudio.load(str(wav_path))
                    audio = audio.to(self.device)
                    # Determine transcript for forced alignment
                    transcript_path = wav_path.with_suffix(".txt")
                    transcript = (
                        transcript_path.read_text().strip()
                        if transcript_path.exists()
                        else (DEFAULT_REFERENCE_TEXT if voice["id"] == "orion" else None)
                    )
                    text_arg = [transcript] if transcript else None
                    prompt = self.encoder(audio, text=text_arg, sample_rate=sr)
                    prompt.save(str(VOICES_DIR / f"{voice['id']}.pt"))
                    self._prompt_cache[voice["id"]] = prompt
                    logger.info(f"Cached voice: {voice['id']}")
                except Exception as e:
                    logger.warning(f"Failed to cache {voice['id']}: {e}")

    def _get_prompt(self, voice_id: str) -> EncoderOutput | None:
        if voice_id in self._prompt_cache:
            return self._prompt_cache[voice_id]
        # Try loading pre-saved cache file
        cache_pt = VOICES_DIR / f"{voice_id}.pt"
        if cache_pt.exists():
            try:
                prompt = EncoderOutput.load(str(cache_pt), device=self.device)
                self._prompt_cache[voice_id] = prompt
                return prompt
            except Exception as e:
                logger.warning(f"Failed to load cached prompt for {voice_id}: {e}")
        # Fall back to orion
        return self._prompt_cache.get("orion")

    def generate(self, text: str, voice_id: str = "orion") -> bytes:
        if voice_id not in VOICE_IDS:
            voice_id = "orion"
        prompt = self._get_prompt(voice_id)
        if prompt is None:
            raise RuntimeError("No reference voice available — ensure tada_voices/orion.wav exists")

        output = self.model.generate(prompt=prompt, text=text)

        buf = io.BytesIO()
        sf.write(buf, output.audio.cpu().numpy(), output.sample_rate, format="WAV")
        buf.seek(0)
        return buf.read()


class RequestHandler(BaseHTTPRequestHandler):
    server_instance: TadaServer

    def do_POST(self):
        if self.path != "/generate":
            self.send_error(404)
            return
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length))
            text = body.get("text", "").strip()
            voice = body.get("voice", "orion")

            if not text:
                self.send_error(400, "text is required")
                return

            audio_bytes = self.server_instance.generate(text, voice)

            self.send_response(200)
            self.send_header("Content-Type", "audio/wav")
            self.send_header("Content-Length", str(len(audio_bytes)))
            self.end_headers()
            self.wfile.write(audio_bytes)
        except Exception as e:
            logger.error(f"Generation error: {e}")
            self.send_error(500, str(e))

    def do_GET(self):
        if self.path == "/health":
            body = json.dumps({
                "status": "healthy",
                "model": MODEL_ID,
                "voices": VOICE_CATALOG,
            }).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            self.send_error(404)

    def log_message(self, *_):
        pass


def main():
    tada = TadaServer()

    class _Handler(RequestHandler):
        server_instance = tada

    httpd = HTTPServer(("localhost", PORT), _Handler)
    print(f"🎙️  TADA TTS Server running on http://localhost:{PORT}")
    print(f"📋 Health:    GET  http://localhost:{PORT}/health")
    print(f"🔊 Generate:  POST http://localhost:{PORT}/generate")
    print(f"🗂️  Voices dir: {VOICES_DIR.resolve()}")
    print(f"   Add <voice>.wav + optional <voice>.txt to register new voices.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Stopped")
    finally:
        httpd.server_close()


if __name__ == "__main__":
    main()
