import asyncio
import json
import uuid
from datetime import datetime
from typing import Dict, Set, Optional, List
from contextlib import asynccontextmanager

import websockets
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import redis.asyncio as redis
from pydantic import BaseModel


class MeetingMessage(BaseModel):
    id: str
    sender: str
    text: str
    timestamp: str
    type: str = "speech"
    metadata: Dict = {}


class MeetingState:
    def __init__(self, session_id: str, redis_client: redis.Redis):
        self.session_id = session_id
        self.redis = redis_client
        self.participants: Set[str] = set()
        self.current_speaker: Optional[str] = None
        self.can_interrupt = False
        self.turn_queue: List[str] = []
        self.messages: List[MeetingMessage] = []
        self.started_at = datetime.utcnow()

    async def add_participant(self, agent_id: str):
        self.participants.add(agent_id)
        await self.redis.sadd(f"meeting:{self.session_id}:participants", agent_id)

    async def remove_participant(self, agent_id: str):
        self.participants.discard(agent_id)
        await self.redis.srem(f"meeting:{self.session_id}:participants", agent_id)

    async def set_speaker(self, agent_id: Optional[str]):
        self.current_speaker = agent_id
        if agent_id:
            await self.redis.set(f"meeting:{self.session_id}:current_speaker", agent_id)
        else:
            await self.redis.delete(f"meeting:{self.session_id}:current_speaker")

    async def allow_interrupt(self, allow: bool = True):
        self.can_interrupt = allow
        await self.redis.set(
            f"meeting:{self.session_id}:can_interrupt", "true" if allow else "false"
        )

    async def add_to_queue(self, agent_id: str):
        if agent_id not in self.turn_queue:
            self.turn_queue.append(agent_id)
            await self.redis.rpush(f"meeting:{self.session_id}:queue", agent_id)

    async def get_next_speaker(self) -> Optional[str]:
        if self.turn_queue:
            return self.turn_queue.pop(0)
        # If no queue, any participant can speak
        return None

    async def save_message(self, msg: MeetingMessage):
        self.messages.append(msg)
        # Keep only last 100 messages in memory
        if len(self.messages) > 100:
            self.messages = self.messages[-100:]


class MeetingBus:
    def __init__(self):
        self.redis: Optional[redis.Redis] = None
        self.meetings: Dict[str, MeetingState] = {}
        self.websocket_connections: Dict[str, Set[WebSocket]] = {}

    async def connect_redis(self):
        self.redis = await redis.from_url("redis://redis:6379", decode_responses=True)

    async def disconnect(self):
        if self.redis:
            await self.redis.close()

    async def create_meeting(self, session_id: str) -> MeetingState:
        meeting = MeetingState(session_id, self.redis)
        self.meetings[session_id] = meeting
        self.websocket_connections[session_id] = set()

        # Set initial state in Redis
        await self.redis.set(f"meeting:{session_id}:status", "waiting")

        return meeting

    async def get_meeting(self, session_id: str) -> Optional[MeetingState]:
        return self.meetings.get(session_id)

    async def join_meeting(self, session_id: str, agent_id: str, websocket: WebSocket):
        # Create meeting if doesn't exist
        if session_id not in self.meetings:
            await self.create_meeting(session_id)

        meeting = self.meetings[session_id]
        await meeting.add_participant(agent_id)

        # Add to websocket connections
        if session_id not in self.websocket_connections:
            self.websocket_connections[session_id] = set()
        self.websocket_connections[session_id].add(websocket)

        # Announce joining
        join_msg = MeetingMessage(
            id=str(uuid.uuid4()),
            sender="system",
            text=f"{agent_id} joined the meeting",
            timestamp=datetime.utcnow().isoformat(),
            type="system",
        )
        await self.broadcast(session_id, join_msg, exclude=[agent_id])

        return meeting

    async def leave_meeting(self, session_id: str, agent_id: str, websocket: WebSocket):
        if session_id in self.meetings:
            meeting = self.meetings[session_id]
            await meeting.remove_participant(agent_id)

        if session_id in self.websocket_connections:
            self.websocket_connections[session_id].discard(websocket)

        # Announce leaving
        leave_msg = MeetingMessage(
            id=str(uuid.uuid4()),
            sender="system",
            text=f"{agent_id} left the meeting",
            timestamp=datetime.utcnow().isoformat(),
            type="system",
        )
        await self.broadcast(session_id, leave_msg)

    async def broadcast(
        self, session_id: str, message: MeetingMessage, exclude: List[str] = None
    ):
        """Broadcast message to all participants in a meeting"""
        if session_id not in self.websocket_connections:
            return

        exclude = exclude or []
        msg_json = json.dumps(message.model_dump())

        # Send to all connected websockets
        disconnected = set()
        for ws in self.websocket_connections[session_id]:
            try:
                await ws.send_text(msg_json)
            except:
                disconnected.add(ws)

        # Clean up disconnected
        for ws in disconnected:
            self.websocket_connections[session_id].discard(ws)

    async def handle_speech(self, session_id: str, message: MeetingMessage):
        """Handle when an agent speaks"""
        if session_id not in self.meetings:
            return

        meeting = self.meetings[session_id]

        # Set as current speaker
        await meeting.set_speaker(message.sender)

        # Don't allow interrupts while speaking
        await meeting.allow_interrupt(False)

        # Save message
        await meeting.save_message(message)

        # Broadcast to all
        await self.broadcast(session_id, message)

    async def handle_speech_end(self, session_id: str, speaker: str):
        """Handle when an agent finishes speaking"""
        if session_id not in self.meetings:
            return

        meeting = self.meetings[session_id]

        # Clear current speaker
        await meeting.set_speaker(None)

        # Allow interrupts briefly after someone finishes
        await meeting.allow_interrupt(True)

        # Brief window for interrupts
        asyncio.create_task(self._close_interrupt_window(session_id))

    async def _close_interrupt_window(self, session_id: str):
        """Close the interrupt window after a brief period"""
        await asyncio.sleep(2)  # 2 second window for interrupts
        if session_id in self.meetings:
            await self.meetings[session_id].allow_interrupt(False)

    async def request_speak(self, session_id: str, agent_id: str):
        """Agent requests to speak (hand raise)"""
        if session_id not in self.meetings:
            return False

        meeting = self.meetings[session_id]

        # If no current speaker, allow immediately
        if not meeting.current_speaker:
            return True

        # Otherwise add to queue
        await meeting.add_to_queue(agent_id)
        return False


# Global meeting bus
bus = MeetingBus()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await bus.connect_redis()
    yield
    await bus.disconnect()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.websocket("/meetings/{session_id}/join")
async def join_meeting(websocket: WebSocket, session_id: str, agent: str = None):
    """WebSocket endpoint for agents to join a meeting"""
    await websocket.accept()

    if not agent:
        await websocket.close(code=4000, reason="Agent ID required")
        return

    await bus.join_meeting(session_id, agent, websocket)

    try:
        # Handle incoming messages from this agent
        async for raw_message in websocket:
            try:
                data = json.loads(raw_message)
                msg = MeetingMessage(**data)

                if msg.type == "speech":
                    await bus.handle_speech(session_id, msg)
                elif msg.type == "speech_end":
                    await bus.handle_speech_end(session_id, msg.sender)
                elif msg.type == "request_speak":
                    can_speak = await bus.request_speak(session_id, msg.sender)
                    await websocket.send_text(json.dumps({"can_speak": can_speak}))

            except json.JSONDecodeError:
                continue

    except WebSocketDisconnect:
        await bus.leave_meeting(session_id, agent, websocket)


@app.post("/meetings/{session_id}/start")
async def start_meeting(session_id: str, agents: List[str]):
    """Start a new meeting with specified agents"""
    meeting = await bus.create_meeting(session_id)

    for agent in agents:
        await meeting.add_participant(agent)

    await bus.redis.set(f"meeting:{session_id}:status", "active")
    await bus.redis.set(
        f"meeting:{session_id}:started_at", datetime.utcnow().isoformat()
    )

    return {"status": "started", "session_id": session_id, "agents": agents}


@app.get("/meetings/{session_id}/status")
async def get_meeting_status(session_id: str):
    """Get current meeting status"""
    meeting = await bus.get_meeting(session_id)

    if not meeting:
        return {"status": "not_found"}

    return {
        "status": "active",
        "session_id": session_id,
        "participants": list(meeting.participants),
        "current_speaker": meeting.current_speaker,
        "queue": meeting.turn_queue,
        "message_count": len(meeting.messages),
    }


@app.get("/meetings/{session_id}/messages")
async def get_meeting_messages(session_id: str, limit: int = 50):
    """Get meeting message history"""
    meeting = await bus.get_meeting(session_id)

    if not meeting:
        return {"messages": []}

    return {"messages": [m.model_dump() for m in meeting.messages[-limit:]]}


@app.post("/meetings/{session_id}/end")
async def end_meeting(session_id: str):
    """End a meeting"""
    if session_id in bus.meetings:
        del bus.meetings[session_id]

    if session_id in bus.websocket_connections:
        for ws in bus.websocket_connections[session_id]:
            await ws.close()
        del bus.websocket_connections[session_id]

    await bus.redis.set(f"meeting:{session_id}:status", "ended")

    return {"status": "ended", "session_id": session_id}


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8002)
