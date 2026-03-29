import uuid
import json
from datetime import datetime
from typing import List, Dict, Optional, Any
from enum import Enum

from fastapi import FastAPI, HTTPException
import redis.asyncio as redis
from pydantic import BaseModel


class MemoryType(str, Enum):
    CONVERSATION = "conversation"
    LEARNING = "learning"
    PREFERENCE = "preference"
    FACT = "fact"


class MemoryEntry(BaseModel):
    id: str = str(uuid.uuid4())
    agent_id: str
    session_id: str
    topic: str
    memory_type: MemoryType
    content: str
    embedding: Optional[List[float]] = None
    importance: float = 0.5
    timestamp: str = datetime.utcnow().isoformat()
    metadata: Dict[str, Any] = {}


class MemoryService:
    def __init__(self):
        self.redis: Optional[redis.Redis] = None

    async def connect(self):
        self.redis = await redis.from_url("redis://redis:6379", decode_responses=True)

    async def disconnect(self):
        if self.redis:
            await self.redis.close()

    async def store_memory(self, entry: MemoryEntry):
        """Store a memory entry"""
        key = f"memory:{entry.id}"

        # Store the entry
        await self.redis.hset(
            key,
            mapping={
                "id": entry.id,
                "agent_id": entry.agent_id,
                "session_id": entry.session_id,
                "topic": entry.topic,
                "memory_type": entry.memory_type.value,
                "content": entry.content,
                "importance": str(entry.importance),
                "timestamp": entry.timestamp,
                "metadata": json.dumps(entry.metadata),
            },
        )

        # Index by agent
        await self.redis.sadd(f"agent:{entry.agent_id}:memories", entry.id)

        # Index by session
        await self.redis.sadd(f"session:{entry.session_id}:memories", entry.id)

        # Index by topic
        await self.redis.sadd(f"topic:{entry.topic}:memories", entry.id)

        return entry

    async def get_agent_memories(
        self, agent_id: str, limit: int = 50
    ) -> List[MemoryEntry]:
        """Get all memories for an agent"""
        memory_ids = await self.redis.smembers(f"agent:{agent_id}:memories")

        memories = []
        for mem_id in list(memory_ids)[:limit]:
            data = await self.redis.hgetall(f"memory:{mem_id}")
            if data:
                memories.append(
                    MemoryEntry(
                        id=data["id"],
                        agent_id=data["agent_id"],
                        session_id=data["session_id"],
                        topic=data["topic"],
                        memory_type=MemoryType(data["memory_type"]),
                        content=data["content"],
                        importance=float(data.get("importance", 0.5)),
                        timestamp=data["timestamp"],
                        metadata=json.loads(data.get("metadata", "{}")),
                    )
                )

        return memories

    async def get_session_memories(
        self, session_id: str, limit: int = 100
    ) -> List[MemoryEntry]:
        """Get all memories from a session"""
        memory_ids = await self.redis.smembers(f"session:{session_id}:memories")

        memories = []
        for mem_id in list(memory_ids)[:limit]:
            data = await self.redis.hgetall(f"memory:{mem_id}")
            if data:
                memories.append(
                    MemoryEntry(
                        id=data["id"],
                        agent_id=data["agent_id"],
                        session_id=data["session_id"],
                        topic=data["topic"],
                        memory_type=MemoryType(data["memory_type"]),
                        content=data["content"],
                        importance=float(data.get("importance", 0.5)),
                        timestamp=data["timestamp"],
                        metadata=json.loads(data.get("metadata", "{}")),
                    )
                )

        return sorted(memories, key=lambda x: x.timestamp)

    async def get_recent_memories(
        self, agent_id: str, hours: int = 24, limit: int = 20
    ) -> List[MemoryEntry]:
        """Get recent memories for an agent"""
        all_memories = await self.get_agent_memories(agent_id, limit=100)

        # Filter by time
        from datetime import timedelta

        cutoff = datetime.utcnow() - timedelta(hours=hours)

        recent = [
            m for m in all_memories if datetime.fromisoformat(m.timestamp) > cutoff
        ]

        return recent[:limit]

    async def search_by_topic(self, topic: str, limit: int = 20) -> List[MemoryEntry]:
        """Search memories by topic"""
        memory_ids = await self.redis.smembers(f"topic:{topic}:memories")

        memories = []
        for mem_id in list(memory_ids)[:limit]:
            data = await self.redis.hgetall(f"memory:{mem_id}")
            if data:
                memories.append(
                    MemoryEntry(
                        id=data["id"],
                        agent_id=data["agent_id"],
                        session_id=data["session_id"],
                        topic=data["topic"],
                        memory_type=MemoryType(data["memory_type"]),
                        content=data["content"],
                        importance=float(data.get("importance", 0.5)),
                        timestamp=data["timestamp"],
                        metadata=json.loads(data.get("metadata", "{}")),
                    )
                )

        return memories

    async def store_conversation(
        self,
        agent_id: str,
        session_id: str,
        topic: str,
        input_text: str,
        output_text: str,
        context: Dict = None,
    ):
        """Convenience method to store a conversation exchange"""

        entry = MemoryEntry(
            agent_id=agent_id,
            session_id=session_id,
            topic=topic,
            memory_type=MemoryType.CONVERSATION,
            content=f"Input: {input_text}\nOutput: {output_text}",
            importance=0.5,
            metadata={"input": input_text, "output": output_text, **(context or {})},
        )

        return await self.store_memory(entry)

    async def get_learning_insights(self, agent_id: str) -> Dict:
        """Get learning insights for an agent"""
        memories = await self.get_agent_memories(agent_id, limit=100)

        # Aggregate insights
        topics_discussed = set()
        total_conversations = 0
        high_importance = []

        for mem in memories:
            if mem.memory_type == MemoryType.CONVERSATION:
                total_conversations += 1
                topics_discussed.add(mem.topic)
            if mem.importance > 0.7:
                high_importance.append(mem)

        return {
            "agent_id": agent_id,
            "total_memories": len(memories),
            "topics_discussed": list(topics_discussed),
            "conversation_count": total_conversations,
            "key_moments": [m.content[:100] for m in high_importance[:5]],
        }


app = FastAPI(title="Memory Service")

memory_service = MemoryService()


@app.on_event("startup")
async def startup_event():
    await memory_service.connect()


@app.on_event("shutdown")
async def shutdown_event():
    await memory_service.disconnect()


@app.post("/memory")
async def store_memory(entry: MemoryEntry):
    """Store a memory entry"""
    result = await memory_service.store_memory(entry)
    return result


@app.get("/agent/{agent_id}/memories")
async def get_agent_memories(agent_id: str, limit: int = 50):
    """Get all memories for an agent"""
    memories = await memory_service.get_agent_memories(agent_id, limit)
    return {"memories": [m.model_dump() for m in memories]}


@app.get("/session/{session_id}/memories")
async def get_session_memories(session_id: str, limit: int = 100):
    """Get all memories from a session"""
    memories = await memory_service.get_session_memories(session_id, limit)
    return {"memories": [m.model_dump() for m in memories]}


@app.get("/agent/{agent_id}/recent")
async def get_recent_memories(agent_id: str, hours: int = 24, limit: int = 20):
    """Get recent memories"""
    memories = await memory_service.get_recent_memories(agent_id, hours, limit)
    return {"memories": [m.model_dump() for m in memories]}


@app.get("/search/topic/{topic}")
async def search_topic(topic: str, limit: int = 20):
    """Search by topic"""
    memories = await memory_service.search_by_topic(topic, limit)
    return {"memories": [m.model_dump() for m in memories]}


@app.post("/conversation")
async def store_conversation(
    agent_id: str,
    session_id: str,
    topic: str,
    input_text: str,
    output_text: str,
    context: Dict = None,
):
    """Store a conversation exchange"""
    result = await memory_service.store_conversation(
        agent_id, session_id, topic, input_text, output_text, context
    )
    return result


@app.get("/agent/{agent_id}/insights")
async def get_learning_insights(agent_id: str):
    """Get learning insights"""
    insights = await memory_service.get_learning_insights(agent_id)
    return insights


@app.delete("/agent/{agent_id}/memories")
async def clear_agent_memories(agent_id: str):
    """Clear all memories for an agent"""
    memory_ids = await memory_service.redis.smembers(f"agent:{agent_id}:memories")

    for mem_id in memory_ids:
        await memory_service.redis.delete(f"memory:{mem_id}")

    await memory_service.redis.delete(f"agent:{agent_id}:memories")

    return {"status": "cleared", "agent_id": agent_id}


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
