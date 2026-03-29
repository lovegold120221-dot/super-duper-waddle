import io
import base64
import uuid
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np


class TTSRequest(BaseModel):
    text: str
    voice: str = "F1"
    lang: str = "en"
    speed: float = 1.05
    quality: int = 5


class TTSChunkRequest(BaseModel):
    text: str
    voice: str = "F1"
    lang: str = "en"
    speed: float = 1.05
    quality: int = 5


tts_instance = None
voice_styles = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    global tts_instance, voice_styles

    try:
        from supertonic import TTS

        tts_instance = TTS(auto_download=True)

        for name in tts_instance.voice_style_names:
            voice_styles[name] = tts_instance.get_voice_style(name)

        print(f"Supertonic TTS initialized with voices: {list(voice_styles.keys())}")
    except Exception as e:
        print(f"Failed to initialize Supertonic: {e}")
        raise

    yield

    print("Shutting down Supertonic TTS")


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    if tts_instance is None:
        return JSONResponse({"status": "loading"}, status_code=503)
    return {"status": "ok", "voices": list(voice_styles.keys())}


@app.get("/voices")
async def list_voices():
    if tts_instance is None:
        raise HTTPException(status_code=503, detail="TTS not ready")
    return {"voices": tts_instance.voice_style_names}


@app.post("/synthesize")
async def synthesize(request: TTSRequest):
    if tts_instance is None:
        raise HTTPException(status_code=503, detail="TTS not ready")

    try:
        style = voice_styles.get(request.voice)
        if style is None:
            style = tts_instance.get_voice_style(request.voice)

        wav, duration = tts_instance.synthesize(
            request.text,
            voice_style=style,
            lang=request.lang,
            speed=request.speed,
            total_steps=request.quality,
        )

        import wave

        buffer = io.BytesIO()
        with wave.open(buffer, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(24000)
            wf.writeframes(wav.tobytes())

        audio_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

        return {
            "audio": audio_base64,
            "duration": float(duration[0])
            if hasattr(duration, "__getitem__")
            else float(duration),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/stream")
async def stream(request: TTSChunkRequest):
    if tts_instance is None:
        raise HTTPException(status_code=503, detail="TTS not ready")

    try:
        style = voice_styles.get(request.voice)
        if style is None:
            style = tts_instance.get_voice_style(request.voice)

        wav, duration = tts_instance.synthesize(
            request.text,
            voice_style=style,
            lang=request.lang,
            speed=request.speed,
            total_steps=request.quality,
            max_chunk_length=300,
        )

        import wave

        buffer = io.BytesIO()
        with wave.open(buffer, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(24000)
            wf.writeframes(wav.tobytes())

        return StreamingResponse(
            iter([buffer.getvalue()]),
            media_type="audio/wav",
            headers={
                "X-Duration": str(
                    float(duration[0])
                    if hasattr(duration, "__getitem__")
                    else float(duration)
                )
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8004)
