import asyncio
import json
import uuid
import base64
import os
from datetime import datetime
from typing import Optional, Dict, Any, List
from contextlib import asynccontextmanager

import websockets
import aiohttp
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import JSONResponse
import redis.asyncio as redis
from pydantic import BaseModel

from config import AgentConfig, AGENTS
from human_behaviors import HumanBehaviorManager


class VoiceStream:
    """Handles Deepgram STT and TTS for real-time voice"""

    def __init__(self, agent_id: str, deepgram_key: str, voice_id: str):
        self.agent_id = agent_id
        self.deepgram_key = deepgram_key
        self.voice_id = voice_id
        self.stt_ws: Optional[websockets.WebSocketClientProtocol] = None
        self.tts_ws: Optional[websockets.WebSocketClientProtocol] = None
        self.audio_queue: asyncio.Queue = asyncio.Queue()
        self.text_queue: asyncio.Queue = asyncio.Queue()
        self.is_listening = False

    async def start_stt(self):
        """Start Deepgram STT for live speech recognition"""
        url = "wss://api.deepgram.com/v1/listen?model=aura-2&encoding=linear16&sample_rate=16000&channels=1"

        self.stt_ws = await websockets.connect(
            url, extra_headers={"Authorization": f"Token {self.deepgram_key}"}
        )
        self.is_listening = True
        print(f"[Voice:{self.agent_id}] STT started")

        asyncio.create_task(self._handle_stt_messages())

    async def _handle_stt_messages(self):
        """Process incoming STT messages"""
        try:
            async for message in self.stt_ws:
                data = json.loads(message)
                if data.get("type") == "Results":
                    transcript = (
                        data.get("channel", {})
                        .get("alternatives", [{}])[0]
                        .get("transcript", "")
                    )
                    if transcript:
                        await self.text_queue.put(transcript)
        except Exception as e:
            print(f"[Voice:{self.agent_id}] STT error: {e}")

    async def feed_audio(self, audio_chunk: bytes):
        """Send audio to STT"""
        if self.stt_ws and self.is_listening:
            await self.stt_ws.send(base64.b64encode(audio_chunk).decode())

    async def start_tts(self):
        """Start Deepgram TTS for voice output"""
        url = "wss://api.deepgram.com/v1/speak?model=aura-2&encoding=audio-24khz-48kgitz-add&sample_rate=48000"

        self.tts_ws = await websockets.connect(
            url, extra_headers={"Authorization": f"Token {self.deepgram_key}"}
        )
        print(f"[Voice:{self.agent_id}] TTS started")

        asyncio.create_task(self._handle_tts_output())

    async def speak_text(self, text: str):
        """Convert text to speech and send to meeting bus"""
        if not self.tts_ws:
            await self.start_tts()

        # Send text to TTS
        msg = json.dumps({"type": "Speak", "text": text})
        await self.tts_ws.send(msg)

    async def _handle_tts_output(self):
        """Process TTS audio output"""
        try:
            async for message in self.tts_ws:
                data = json.loads(message)
                if data.get("type") == "audio":
                    audio_data = base64.b64decode(data.get("data", ""))
                    await self.audio_queue.put(audio_data)
        except Exception as e:
            print(f"[Voice:{self.agent_id}] TTS error: {e}")

    async def get_audio(self) -> Optional[bytes]:
        """Get next audio chunk (non-blocking)"""
        try:
            return self.audio_queue.get_nowait()
        except asyncio.QueueEmpty:
            return None

    async def stop(self):
        """Stop voice streams"""
        self.is_listening = False
        if self.stt_ws:
            await self.stt_ws.close()
        if self.tts_ws:
            await self.tts_ws.close()


class Message(BaseModel):
    id: str
    sender: str
    text: str
    timestamp: str
    type: str = "speech"  # speech, interrupt, reaction
    metadata: Dict[str, Any] = {}


class Agent:
    def __init__(self, config: AgentConfig):
        self.config = config
        self.agent_id = config.name.lower()
        self.websocket: Optional[websockets.WebSocketClientProtocol] = None
        self.redis: Optional[redis.Redis] = None
        self.session_id: Optional[str] = None
        self.is_listening = False
        self.is_speaking = False
        self.conversation_history: List[Dict] = []
        self.llm_session = aiohttp.ClientSession()
        self.voice_stream: Optional[VoiceStream] = None
        self.human_behaviors: Optional[HumanBehaviorManager] = None

    async def init_voice(self):
        """Initialize voice (STT + TTS)"""
        if self.config.deepgram_api_key:
            self.voice_stream = VoiceStream(
                self.agent_id, self.config.deepgram_api_key, self.config.voice_id
            )
            print(f"[{self.config.name}] Voice initialized")

    async def connect_to_meeting_bus(self):
        """Connect to the real-time meeting bus"""
        url = f"{self.config.meeting_bus_url}/meetings/{self.session_id}/join?agent={self.agent_id}"
        self.websocket = await websockets.connect(url)
        print(f"[{self.config.name}] Connected to meeting bus")

    async def connect_to_redis(self):
        """Connect to Redis for shared state"""
        self.redis = await redis.from_url("redis://redis:6379", decode_responses=True)

    async def init_human_behaviors(self):
        """Initialize human behavior systems"""
        if self.redis and self.session_id:
            self.human_behaviors = HumanBehaviorManager(
                self.agent_id, self.redis, self.session_id, self.websocket.send
            )
            print(f"[{self.config.name}] Human behaviors initialized")

    async def disconnect(self):
        """Clean up connections"""
        if self.websocket:
            await self.websocket.close()
        if self.llm_session:
            await self.llm_session.close()
        if self.redis:
            await self.redis.close()

    async def send_message(self, text: str, msg_type: str = "speech"):
        """Send a message to the meeting bus"""
        if not self.websocket:
            return

        message = Message(
            id=str(uuid.uuid4()),
            sender=self.config.name,
            text=text,
            timestamp=datetime.utcnow().isoformat(),
            type=msg_type,
        )

        await self.websocket.send(json.dumps(message.model_dump()))

    async def listen_for_messages(self):
        """Main loop: listen for messages from other agents"""
        if not self.websocket:
            return

        try:
            async for raw_message in self.websocket:
                if self.is_speaking:
                    # Agent is currently speaking - may want to handle interrupts
                    pass

                data = json.loads(raw_message)
                msg = Message(**data)

                # Don't process own messages
                if msg.sender == self.config.name:
                    continue

                # Add to conversation history
                self.conversation_history.append(
                    {
                        "sender": msg.sender,
                        "text": msg.text,
                        "timestamp": msg.timestamp,
                        "type": msg.type,
                    }
                )

                # Process the message
                await self.process_message(msg)

        except websockets.ConnectionClosed:
            print(f"[{self.config.name}] Connection to meeting bus closed")

    async def process_message(self, msg: Message):
        """Process incoming message - decide whether to react"""
        # Check if should respond
        should_respond = await self.should_respond(msg)

        if should_respond:
            # Small random delay to feel natural
            await asyncio.sleep(0.5)
            await self.respond_to_message(msg)

    async def should_respond(self, msg: Message) -> bool:
        """Determine if agent should respond to this message"""
        # Always respond to being directly addressed
        if self.config.name.lower() in msg.text.lower():
            return True

        # Check turn-taking system
        if self.redis:
            current_speaker = await self.redis.get(
                f"meeting:{self.session_id}:current_speaker"
            )
            can_interrupt = await self.redis.get(
                f"meeting:{self.session_id}:can_interrupt"
            )

            # If someone else is speaking and interrupts allowed, small chance to interrupt
            if (
                current_speaker
                and current_speaker != self.agent_id
                and can_interrupt == "true"
            ):
                import random

                return random.random() < 0.1  # 10% chance to interrupt

        return False

    async def respond_to_message(self, original_msg: Message):
        """Generate and send response"""
        self.is_speaking = True

        try:
            # Get relevant context from history
            context = self.build_context(original_msg)

            # Generate response with LLM
            response_text = await self.generate_response(context)

            # Send to meeting bus (will be converted to voice by TTS)
            await self.send_message(response_text)

            # Save to memory
            if self.config.memory_enabled:
                await self.save_to_memory(original_msg.text, response_text)

        finally:
            self.is_speaking = False

    def build_context(self, last_message: Message) -> str:
        """Build context prompt from conversation history"""
        context = f"RECENT CONVERSATION:\n"

        # Last 10 messages
        recent = self.conversation_history[-10:]
        for msg in recent:
            context += f"- {msg['sender']}: {msg['text'][:100]}...\n"

        context += f"\nLAST MESSAGE: {last_message.sender}: {last_message.text}\n"

        context += f"\nYou are {self.config.name}, {self.config.role}.\n"
        context += f"{self.config.persona}\n"
        context += f"\nRespond naturally as if in a team meeting. Keep it SHORT: 1-3 sentences. React to what was said."

        return context

    async def generate_response(self, context: str) -> str:
        """Generate response using LLM"""
        if self.config.llm_provider == "ollama":
            return await self._generate_ollama(context)
        else:
            return await self._generate_gemini(context)

    async def _generate_ollama(self, prompt: str) -> str:
        """Generate using Ollama"""
        url = f"{self.config.ollama_url}/api/generate"

        payload = {
            "model": self.config.ollama_model,
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": 0.85, "top_p": 0.92, "num_predict": 500},
        }

        async with self.llm_session.post(url, json=payload) as resp:
            if resp.status != 200:
                return "Sorry, I had trouble generating a response."
            data = await resp.json()
            return data.get("response", "").strip()

    async def _generate_gemini(self, prompt: str) -> str:
        """Generate using Gemini"""
        if not self.config.gemini_api_key:
            return "Gemini API key not configured."

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={self.config.gemini_api_key}"

        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.85, "maxOutputTokens": 500},
        }

        async with self.llm_session.post(url, json=payload) as resp:
            if resp.status != 200:
                return "Sorry, I had trouble generating a response."
            data = await resp.json()
            try:
                return data["candidates"][0]["content"]["parts"][0]["text"]
            except:
                return "Sorry, I had trouble generating a response."

    async def save_to_memory(self, input_text: str, response_text: str):
        """Save conversation to memory service for learning"""
        try:
            url = f"{self.config.memory_service_url}/memory"
            payload = {
                "agent_id": self.agent_id,
                "session_id": self.session_id,
                "input": input_text,
                "output": response_text,
                "timestamp": datetime.utcnow().isoformat(),
            }

            async with self.llm_session.post(url, json=payload) as resp:
                pass  # Fire and forget
        except Exception as e:
            print(f"[{self.config.name}] Failed to save memory: {e}")

    async def start_voice_listening(self):
        """Start Deepgram STT for live voice input"""
        # This would connect to Deepgram for real-time transcription
        # Implementation depends on meeting bus audio routing
        pass

    async def speak(self, text: str):
        """Convert text to speech and play"""
        # This would connect to Deepgram TTS
        # Then play audio through meeting bus
        pass


app = FastAPI()

# Store active agents
agents: Dict[str, Agent] = {}


@app.post("/agents/{agent_name}/start")
async def start_agent(agent_name: str, session_id: str):
    """Start an agent for a meeting session"""
    if agent_name not in AGENTS:
        raise HTTPException(status_code=404, detail="Agent not found")

    config = AGENTS[agent_name]
    agent = Agent(config)
    agent.session_id = session_id

    await agent.connect_to_meeting_bus()
    await agent.connect_to_redis()
    await agent.init_voice()
    await agent.init_human_behaviors()

    agents[agent_name] = agent

    # Start listening in background
    asyncio.create_task(agent.listen_for_messages())

    return {
        "status": "started",
        "agent": agent_name,
        "session": session_id,
        "voice_enabled": bool(agent.voice_stream),
    }


@app.post("/agents/{agent_name}/stop")
async def stop_agent(agent_name: str):
    """Stop an agent"""
    if agent_name in agents:
        await agents[agent_name].disconnect()
        del agents[agent_name]

    return {"status": "stopped", "agent": agent_name}


@app.get("/agents/{agent_name}/status")
async def get_agent_status(agent_name: str):
    """Get agent status"""
    if agent_name not in agents:
        return {"status": "not_running"}

    agent = agents[agent_name]
    return {
        "status": "running",
        "session": agent.session_id,
        "is_listening": agent.is_listening,
        "is_speaking": agent.is_speaking,
        "messages_in_history": len(agent.conversation_history),
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


# Human behavior APIs
@app.get("/agents/{agent_name}/presence")
async def get_presence(agent_name: str):
    """Get presence awareness for an agent"""
    if agent_name not in agents:
        return {"error": "Agent not running"}

    agent = agents[agent_name]
    if not agent.human_behaviors:
        return {"error": "Human behaviors not initialized"}

    summary = await agent.human_behaviors.presence.get_activity_summary()
    return summary


@app.get("/agents/{agent_name}/quiet")
async def get_quiet_participants(agent_name: str, threshold_minutes: int = 10):
    """Get participants who haven't spoken recently"""
    if agent_name not in agents:
        return {"error": "Agent not running"}

    agent = agents[agent_name]
    if not agent.human_behaviors:
        return {"error": "Human behaviors not initialized"}

    quiet = await agent.human_behaviors.presence.get_quiet_participants(
        threshold_minutes
    )
    return {"quiet_participants": quiet}


@app.get("/agents/{agent_name}/actions")
async def get_action_items(agent_name: str, owner: str = None):
    """Get action items"""
    if agent_name not in agents:
        return {"error": "Agent not running"}

    agent = agents[agent_name]
    if not agent.human_behaviors:
        return {"error": "Human behaviors not initialized"}

    items = await agent.human_behaviors.actions.get_action_items(
        agent.session_id, owner
    )
    return {"action_items": [i.__dict__ for i in items]}


@app.get("/agents/{agent_name}/memory")
async def get_memory_context(agent_name: str, limit: int = 5):
    """Get recent memory context"""
    if agent_name not in agents:
        return {"error": "Agent not running"}

    agent = agents[agent_name]
    if not agent.human_behaviors:
        return {"error": "Human behaviors not initialized"}

    context = await agent.human_behaviors.memory.get_recent_context(agent_name, limit)
    return {"context": context}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
