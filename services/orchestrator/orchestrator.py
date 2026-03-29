import asyncio
import json
import uuid
import random
from contextlib import asynccontextmanager
from datetime import datetime
from typing import List, Dict, Optional, Set
from enum import Enum

import websockets
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import redis.asyncio as redis
from pydantic import BaseModel
import aiohttp


class MeetingPhase(str, Enum):
    WAITING = "waiting"
    INTRO = "intro"
    DISCUSSION = "discussion"
    SYNTHESIS = "synthesis"
    ENDED = "ended"


class TurnStrategy(str, Enum):
    MANAGER_CONTROLLED = "manager_controlled"  # Host decides who speaks
    SELF_ORGANIZING = "self_organizing"  # Agents raise hands, host facilitates
    FREE_FORM = "free_form"  # Anyone can speak anytime


class Orchestrator:
    def __init__(self):
        self.redis: Optional[redis.Redis] = None
        self.active_sessions: Dict[str, dict] = {}
        self.websocket: Optional[websockets.WebSocketClientProtocol] = None

    async def connect_redis(self):
        self.redis = await redis.from_url("redis://redis:6379", decode_responses=True)

    async def disconnect(self):
        if self.redis:
            await self.redis.close()

    async def create_session(
        self,
        session_id: str,
        topic: str,
        agents: List[str],
        strategy: TurnStrategy = TurnStrategy.SELF_ORGANIZING,
        max_rounds: int = 5,
    ) -> dict:
        """Create a new meeting session"""

        session = {
            "session_id": session_id,
            "topic": topic,
            "agents": agents,
            "strategy": strategy,
            "max_rounds": max_rounds,
            "current_round": 0,
            "phase": MeetingPhase.WAITING,
            "created_at": datetime.utcnow().isoformat(),
            "turn_order": self._generate_turn_order(agents),
            "current_turn_index": 0,
            "participation_count": {agent: 0 for agent in agents},
        }

        self.active_sessions[session_id] = session

        # Store in Redis
        await self.redis.hset(
            f"session:{session_id}",
            mapping={
                "topic": topic,
                "strategy": strategy.value,
                "max_rounds": str(max_rounds),
                "phase": MeetingPhase.WAITING.value,
                "agents": json.dumps(agents),
            },
        )

        return session

    def _generate_turn_order(self, agents: List[str]) -> List[str]:
        """Generate a turn order with the host (Nexus) starting/ending rounds"""
        # Filter out Nexus if present, we'll insert it strategically
        specialists = [a for a in agents if a.lower() != "nexus"]
        random.shuffle(specialists)

        turn_order = []

        # Nexus starts each round as host
        if "nexus" in [a.lower() for a in agents]:
            turn_order.append("nexus")

        turn_order.extend(specialists)

        return turn_order

    async def start_meeting(self, session_id: str) -> dict:
        """Start the meeting - transitions from waiting to intro"""
        if session_id not in self.active_sessions:
            raise ValueError(f"Session {session_id} not found")

        session = self.active_sessions[session_id]
        session["phase"] = MeetingPhase.INTRO
        session["current_round"] = 1

        # Update Redis
        await self.redis.hset(
            f"session:{session_id}", "phase", MeetingPhase.INTRO.value
        )
        await self.redis.hset(f"session:{session_id}", "current_round", "1")

        return session

    async def get_current_speaker(self, session_id: str) -> Optional[str]:
        """Get the agent who should speak next"""
        if session_id not in self.active_sessions:
            return None

        session = self.active_sessions[session_id]

        if session["phase"] == MeetingPhase.ENDED:
            return None

        turn_order = session["turn_order"]
        idx = session["current_turn_index"]

        if idx >= len(turn_order):
            # Round complete, check if we should continue
            if session["current_round"] >= session["max_rounds"]:
                session["phase"] = MeetingPhase.SYNTHESIS
                return "nexus"  # Nexus summarizes
            else:
                # Start new round
                session["current_round"] += 1
                session["current_turn_index"] = 0
                random.shuffle(session["turn_order"])
                idx = 0

        speaker = turn_order[idx]
        session["participation_count"][speaker] = (
            session["participation_count"].get(speaker, 0) + 1
        )

        return speaker

    async def advance_turn(self, session_id: str):
        """Move to the next speaker"""
        if session_id not in self.active_sessions:
            return

        session = self.active_sessions[session_id]

        # Check if round is complete
        if session["current_turn_index"] >= len(session["turn_order"]) - 1:
            if session["current_round"] >= session["max_rounds"]:
                session["phase"] = MeetingPhase.SYNTHESIS
            else:
                session["current_round"] += 1
                session["current_turn_index"] = 0
                # Reshuffle for variety
                order = [a for a in session["turn_order"] if a.lower() != "nexus"]
                random.shuffle(order)
                session["turn_order"] = (
                    ["nexus"] + order
                    if "nexus" in [a.lower() for a in session["agents"]]
                    else order
                )
        else:
            session["current_turn_index"] += 1

    async def end_meeting(self, session_id: str) -> dict:
        """End the meeting"""
        if session_id not in self.active_sessions:
            raise ValueError(f"Session {session_id} not found")

        session = self.active_sessions[session_id]
        session["phase"] = MeetingPhase.ENDED
        session["ended_at"] = datetime.utcnow().isoformat()

        await self.redis.hset(
            f"session:{session_id}", "phase", MeetingPhase.ENDED.value
        )

        return session

    async def get_session_status(self, session_id: str) -> Optional[dict]:
        """Get current session status"""
        if session_id not in self.active_sessions:
            return None

        session = self.active_sessions[session_id]

        return {
            "session_id": session_id,
            "topic": session["topic"],
            "phase": session["phase"].value,
            "current_round": session["current_round"],
            "max_rounds": session["max_rounds"],
            "agents": session["agents"],
            "turn_order": session["turn_order"],
            "current_turn_index": session["current_turn_index"],
            "participation": session["participation_count"],
        }

    async def notify_agent_to_speak(self, session_id: str, agent_id: str):
        """Send a message to an agent telling them to speak"""
        # This would connect to the agent's WebSocket and tell them to generate a response
        pass


# Global orchestrator
orchestrator = Orchestrator()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await orchestrator.connect_redis()
    yield
    await orchestrator.disconnect()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CreateSessionRequest(BaseModel):
    topic: str
    agents: List[str]
    strategy: TurnStrategy = TurnStrategy.SELF_ORGANIZING
    max_rounds: int = 5


@app.post("/sessions")
async def create_session(request: CreateSessionRequest):
    """Create a new meeting session"""
    session_id = str(uuid.uuid4())

    session = await orchestrator.create_session(
        session_id=session_id,
        topic=request.topic,
        agents=request.agents,
        strategy=request.strategy,
        max_rounds=request.max_rounds,
    )

    return {"session_id": session_id, **session}


@app.post("/sessions/{session_id}/start")
async def start_session(session_id: str):
    """Start a meeting session"""
    session = await orchestrator.start_meeting(session_id)
    return session


@app.get("/sessions/{session_id}")
async def get_session(session_id: str):
    """Get session status"""
    status = await orchestrator.get_session_status(session_id)

    if not status:
        raise HTTPException(status_code=404, detail="Session not found")

    return status


@app.post("/sessions/{session_id}/next-speaker")
async def get_next_speaker(session_id: str):
    """Get the next speaker"""
    speaker = await orchestrator.get_current_speaker(session_id)

    if speaker is None:
        return {"speaker": None, "reason": "meeting_ended"}

    return {"speaker": speaker}


@app.post("/sessions/{session_id}/advance")
async def advance_turn(session_id: str):
    """Advance to next turn"""
    await orchestrator.advance_turn(session_id)
    return await orchestrator.get_session_status(session_id)


@app.post("/sessions/{session_id}/end")
async def end_session(session_id: str):
    """End a meeting session"""
    session = await orchestrator.end_meeting(session_id)
    return session


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8003)
