import os
import asyncio
import uuid
import base64
from typing import Dict, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from google import genai
from google.genai import types


VOICES = {
    "Nexus": "Charon",
    "Atlas": "Orion",
    "Echo": "Puck",
    "Veda": "Aoede",
    "Nova": "Luna",
    "Cipher": "Fenrir",
}

DEFAULT_VOICE = "Charon"


class GeminiLiveSession:
    def __init__(self, session_id: str, voice: str, api_key: str):
        self.session_id = session_id
        self.voice = voice
        self.api_key = api_key
        self.client = genai.Client(
            http_options={"api_version": "v1beta"}, api_key=api_key
        )
        self.session = None
        self.session_cm = None  # Store the context manager
        self.websocket: Optional[WebSocket] = None
        self.audio_queue: asyncio.Queue = asyncio.Queue()
        self.text_buffer = ""
        self.is_active = False

    async def connect(self):
        config = types.LiveConnectConfig(
            response_modalities=["AUDIO"],
            media_resolution="MEDIA_RESOLUTION_LOW",
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name=self.voice
                    )
                )
            ),
        )

        print(f"Connecting with voice: {self.voice}")

        # Get the async context manager
        cm = self.client.aio.live.connect(
            model="models/gemini-3.1-flash-live-preview", config=config
        )
        print(f"Context manager type: {type(cm)}")

        # Enter the context and get the session
        self.session = await cm.__aenter__()
        print(f"Session type: {type(self.session)}")
        print(f"Session dir: {dir(self.session)[:10]}")

        self.session_cm = cm
        self.is_active = True

    async def send_text(self, text: str, end_of_turn: bool = True):
        if self.session:
            try:
                from google.genai import types

                content = types.Content(role="user", parts=[types.Part(text=text)])
                await self.session.send_client_content(
                    content=content, end_of_turn=end_of_turn
                )
            except Exception as e:
                print(f"Send error: {e}")

    async def receive_audio(self):
        if not self.session:
            print("No session for receive_audio")
            return

        try:
            print("Starting to receive audio...")
            async for response in self.session.receive():
                print(
                    f"Received response: data={bool(response.data)}, text={bool(response.text)}"
                )
                if response.data:
                    print(f"Sending audio chunk: {len(response.data)} bytes")
                    await self.websocket.send_bytes(response.data)
                if response.text:
                    print(f"Sending text: {response.text[:50]}...")
                    await self.websocket.send_json(
                        {"type": "text", "text": response.text}
                    )
            print("receive_audio loop ended")
        except Exception as e:
            print(f"receive_audio error: {e}")
            await self.websocket.send_json({"type": "error", "error": str(e)})

    async def close(self):
        self.is_active = False
        if self.session:
            try:
                self.session = None
            except Exception:
                pass
        if self.session_cm:
            try:
                await self.session_cm.__aexit__(None, None, None)
            except Exception:
                pass
            self.session_cm = None


sessions: Dict[str, GeminiLiveSession] = {}
session_tasks: Dict[str, asyncio.Task] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    for session in sessions.values():
        await session.close()


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
    return {
        "status": "ok",
        "active_sessions": len([s for s in sessions.values() if s.is_active]),
    }


@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()

    voice = DEFAULT_VOICE
    api_key = os.environ.get("GEMINI_API_KEY")

    if not api_key:
        await websocket.send_json(
            {"type": "error", "error": "GEMINI_API_KEY not configured"}
        )
        await websocket.close()
        return

    session = GeminiLiveSession(session_id, voice, api_key)
    sessions[session_id] = session
    session.websocket = websocket

    try:
        await session.connect()

        receive_task = asyncio.create_task(session.receive_audio())

        while True:
            data = await websocket.receive_json()

            if data.get("type") == "text":
                await session.send_text(
                    data.get("text", ""), end_of_turn=data.get("end_of_turn", True)
                )
            elif data.get("type") == "end":
                break

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "error": str(e)})
        except:
            pass
    finally:
        receive_task.cancel() if "receive_task" in locals() else None
        await session.close()
        sessions.pop(session_id, None)


@app.post("/session")
async def create_session(voice: str = "Charon"):
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")

    session_id = str(uuid.uuid4())
    session = GeminiLiveSession(session_id, voice, api_key)
    sessions[session_id] = session

    try:
        await session.connect()
        return {"session_id": session_id}
    except Exception as e:
        sessions.pop(session_id, None)
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/session/{session_id}")
async def close_session(session_id: str):
    session = sessions.pop(session_id, None)
    if session:
        await session.close()
        return {"status": "closed"}
    raise HTTPException(status_code=404, detail="Session not found")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8005)
