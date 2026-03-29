from pydantic import BaseModel
from typing import Optional
import os

from prompts import AGENT_PROMPTS


class AgentConfig(BaseModel):
    name: str
    role: str
    persona: str
    voice_id: str
    language: str = "en"

    # LLM Settings
    llm_provider: str = "ollama"  # or "gemini"
    ollama_url: str = "http://ollama:11434"
    ollama_model: str = "qwen3:8b"
    gemini_api_key: Optional[str] = None

    # Memory Settings
    memory_enabled: bool = True
    memory_service_url: str = "http://memory:8001"

    # Meeting Bus
    meeting_bus_url: str = "ws://meeting-bus:8002"

    # Deepgram
    deepgram_api_key: str = "53e38bd851d1646434640bc291cdd95469a5b238"
    cartesia_api_key: Optional[str] = None


# Default agent configurations - using human-like prompts
AGENTS = {
    "atlas": AgentConfig(
        name="Atlas",
        role="System Architect",
        persona=AGENT_PROMPTS["atlas"],
        voice_id="aura-2-thorin-en",
    ),
    "veda": AgentConfig(
        name="Veda",
        role="Full-Stack Developer",
        persona=AGENT_PROMPTS["veda"],
        voice_id="aura-2-asteria-en",
    ),
    "echo": AgentConfig(
        name="Echo",
        role="DevOps Engineer",
        persona=AGENT_PROMPTS["echo"],
        voice_id="aura-2-orpheus-en",
    ),
    "nova": AgentConfig(
        name="Nova",
        role="AI/ML Engineer",
        persona=AGENT_PROMPTS["nova"],
        voice_id="aura-2-athena-en",
    ),
    "cipher": AgentConfig(
        name="Cipher",
        role="Security Expert",
        persona=AGENT_PROMPTS["cipher"],
        voice_id="aura-2-zeus-en",
    ),
    "nexus": AgentConfig(
        name="Nexus",
        role="Meeting Host",
        persona=AGENT_PROMPTS["nexus"],
        voice_id="aura-2-athena-en",
    ),
}
