"""
Human Meeting Behaviors Module

Adds realistic human elements to agent conversations:
- Backchanneling (mm-hmm, yeah, uh-huh)
- Laughter detection and generation
- Turn overlaps and interruptions
- Action item tracking
- Meeting memory (past discussions)
- Presence awareness
- Mood injection (sighs, pauses, emphasis)
"""

import asyncio
import random
import re
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field
import json


# ============================================================
# BACKCHANNELING - Small sounds while others speak
# ============================================================

BACKCHANNELS = [
    "mm-hmm",
    "yeah",
    "uh-hmm",
    "right",
    "exactly",
    "got it",
    "I see",
    "go on",
    "and?",
    "so?",
    "oh",
    "aha",
    "oh I see",
    "that makes sense",
    "gotcha",
    "sure",
    "yep",
    "nice",
]

BACKCHANNEL_WEIGHTS = {
    "mm-hmm": 0.2,
    "yeah": 0.2,
    "right": 0.1,
    "exactly": 0.1,
    "got it": 0.1,
    "I see": 0.1,
    "oh": 0.1,
    "aha": 0.1,
}


class BackchannelManager:
    """Manages backchannel sounds from listening agents"""

    def __init__(self, agent_id: str, send_websocket):
        self.agent_id = agent_id
        self.send_websocket = send_websocket
        self.is_listening = False
        self.backchannel_task: Optional[asyncio.Task] = None

    def start_listening(self):
        """Start giving backchannels while others speak"""
        self.is_listening = True
        self.backchannel_task = asyncio.create_task(self._backchannel_loop())

    def stop_listening(self):
        """Stop backchanneling"""
        self.is_listening = False
        if self.backchannel_task:
            self.backchannel_task.cancel()

    async def _backchannel_loop(self):
        """Randomly emit backchannels at natural intervals"""
        while self.is_listening:
            # Wait random interval between 2-5 seconds
            wait_time = random.uniform(2.0, 5.0)
            await asyncio.sleep(wait_time)

            if not self.is_listening:
                break

            # 40% chance to backchannel
            if random.random() < 0.4:
                await self._emit_backchannel()

    async def _emit_backchannel(self):
        """Send a backchannel sound"""
        # Choose backchannel with weighted random
        backchannel = random.choices(
            list(BACKCHANNEL_WEIGHTS.keys()), weights=list(BACKCHANNEL_WEIGHTS.values())
        )[0]

        message = {
            "type": "backchannel",
            "sender": self.agent_id,
            "text": backchannel,
            "timestamp": datetime.utcnow().isoformat(),
        }

        await self.send_websocket(json.dumps(message))


# ============================================================
# LAUGHTER DETECTION & GENERATION
# ============================================================

# Patterns that often indicate humor in text
HUMOR_PATTERNS = [
    r"\b(lol|lmao|hilarious|funny|haha|😂|🤣)\b",
    r"\b(joke|spicy take|roast)\b",
    r"\?.*\!.*\?",  # Question + exclamation
    r"(sorry|apologies).*(laugh|smile|joke)",
    r"\b(oh my|ome|omg)\b",
    r"\[.*[Ll]augh.*\]",
    r"\[.*[Cc]huckl.*\]",
    r"\[.*[Jj]oke.*\]",
    r"\btongue.*cheek\b",
    r"\bsarcastic\b",
    r"\bdeadpan\b",
    r"\b(just kidding|jk|j/k)\b",
]

LAUGHTER_VARIANTS = [
    "haha",
    "hehe",
    "lol",
    " chuckles ",
    " laughs ",
    "*chuckles*",
    "*laughs*",
    "haha yeah",
    "oh you...",
]


class LaughterDetector:
    """Detect humor in text to trigger laughter"""

    def __init__(self):
        self.patterns = [re.compile(p, re.IGNORECASE) for p in HUMOR_PATTERNS]
        self.last_laugh_time = None
        self.min_laugh_interval = 3.0  # seconds

    def detect_humor(self, text: str) -> bool:
        """Check if text likely contains humor"""
        text = text.lower()

        for pattern in self.patterns:
            if pattern.search(text):
                # Check cooldown
                if self.last_laugh_time:
                    elapsed = (datetime.utcnow() - self.last_laugh_time).total_seconds()
                    if elapsed < self.min_laugh_interval:
                        return False

                self.last_laugh_time = datetime.utcnow()
                return True

        return False

    def should_laugh(self, text: str) -> bool:
        """Determine if should laugh at text (with randomness)"""
        if not self.detect_humor(text):
            return False

        # 30% chance to laugh when humor detected
        return random.random() < 0.3

    def generate_laugh(self) -> str:
        """Generate a natural laugh response"""
        return random.choice(LAUGHTER_VARIANTS)


# ============================================================
# TURN OVERLAP & INTERRUPTION SYSTEM
# ============================================================


@dataclass
class OverlapAttempt:
    agent_id: str
    timestamp: datetime
    text: str
    status: str = "pending"  # pending, granted, denied


class OverlapManager:
    """Manages turn overlaps and interruptions"""

    def __init__(self, redis_client):
        self.redis = redis_client
        self.pending_overlaps: Dict[str, OverlapAttempt] = {}

    async def request_to_speak(self, session_id: str, agent_id: str, text: str) -> bool:
        """Request to overlap/speak while someone else is"""
        # Check if interrupts are allowed
        can_interrupt = await self.redis.get(f"meeting:{session_id}:can_interrupt")
        if can_interrupt != "true":
            return False

        # Check current speaker
        current_speaker = await self.redis.get(f"meeting:{session_id}:current_speaker")
        if not current_speaker or current_speaker == agent_id:
            return False

        # 20% chance to be granted when interrupting
        granted = random.random() < 0.2

        if granted:
            await self.redis.set(f"meeting:{session_id}:overlap_{agent_id}", "granted")

        return granted

    async def check_granted(self, session_id: str, agent_id: str) -> bool:
        """Check if overlap was granted"""
        result = await self.redis.get(f"meeting:{session_id}:overlap_{agent_id}")
        if result == "granted":
            await self.redis.delete(f"meeting:{session_id}:overlap_{agent_id}")
            return True
        return False


# ============================================================
# ACTION ITEM TRACKER
# ============================================================


@dataclass
class ActionItem:
    id: str
    description: str
    owner: str
    created_at: datetime
    due_date: Optional[datetime] = None
    status: str = "pending"  # pending, in_progress, completed
    context: str = ""  # What was being discussed


class ActionItemTracker:
    """Track action items from meetings"""

    def __init__(self, redis_client):
        self.redis = redis_client

    async def add_action_item(
        self, session_id: str, description: str, owner: str, context: str = ""
    ) -> ActionItem:
        """Add a new action item"""
        item = ActionItem(
            id=f"action_{datetime.utcnow().timestamp()}",
            description=description,
            owner=owner,
            created_at=datetime.utcnow(),
            context=context,
        )

        # Store in Redis
        key = f"meeting:{session_id}:actions"
        await self.redis.rpush(
            key,
            json.dumps(
                {
                    "id": item.id,
                    "description": item.description,
                    "owner": item.owner,
                    "created_at": item.created_at.isoformat(),
                    "status": item.status,
                    "context": item.context,
                }
            ),
        )

        return item

    async def get_action_items(
        self, session_id: str, owner: Optional[str] = None
    ) -> List[ActionItem]:
        """Get action items, optionally filtered by owner"""
        key = f"meeting:{session_id}:actions"
        items = await self.redis.lrange(key, 0, -1)

        action_items = []
        for item_json in items:
            item_data = json.loads(item_json)
            if owner and item_data["owner"] != owner:
                continue
            action_items.append(ActionItem(**item_data))

        return action_items

    async def complete_action(self, session_id: str, action_id: str):
        """Mark an action item as complete"""
        # This would update the item in Redis
        pass

    async def check_overdue(self, session_id: str) -> List[ActionItem]:
        """Check for overdue action items"""
        items = await self.get_action_items(session_id)
        now = datetime.utcnow()

        overdue = []
        for item in items:
            if item.status == "pending" and item.due_date:
                if item.due_date < now:
                    overdue.append(item)

        return overdue


# ============================================================
# MEETING MEMORY - Reference past discussions
# ============================================================


class MeetingMemory:
    """Manages long-term memory of past meetings and discussions"""

    def __init__(self, redis_client):
        self.redis = redis_client

    async def save_topic_discussion(
        self, agent_id: str, topic: str, summary: str, sentiment: str = "neutral"
    ):
        """Save that a topic was discussed"""
        key = f"memory:{agent_id}:topics"

        await self.redis.zadd(
            key,
            {
                json.dumps(
                    {
                        "topic": topic,
                        "summary": summary,
                        "discussed_at": datetime.utcnow().isoformat(),
                        "sentiment": sentiment,
                    }
                ): datetime.utcnow().timestamp()
            },
        )

    async def get_topic_history(self, agent_id: str, topic: str) -> List[Dict]:
        """Get past discussions on a topic"""
        key = f"memory:{agent_id}:topics"

        # Get all topics
        topics = await self.redis.zrange(key, 0, -1, withscores=True)

        matching = []
        for topic_json, score in topics:
            data = json.loads(topic_json)
            if topic.lower() in data["topic"].lower():
                matching.append(data)

        return matching

    async def get_recent_context(self, agent_id: str, limit: int = 5) -> str:
        """Get context about recent discussions for prompting"""
        key = f"memory:{agent_id}:topics"

        topics = await self.redis.zrevrange(key, 0, limit - 1, withscores=True)

        if not topics:
            return ""

        context = "RECENT DISCUSSIONS:\n"
        for topic_json, _ in topics:
            data = json.loads(topic_json)
            context += f"- {data['discussed_at'][:10]}: {data['topic']} - {data['summary'][:50]}...\n"

        return context

    async def reference_past(self, agent_id: str, current_topic: str) -> Optional[str]:
        """Generate a reference to past discussion on similar topic"""
        history = await self.get_topic_history(agent_id, current_topic)

        if not history:
            return None

        past = random.choice(history)

        references = [
            f"Like we discussed back in {past['discussed_at'][:10]}...",
            f"I think we talked about this before...",
            f"Reminds me of our discussion about {past['topic']}...",
            f"On {past['discussed_at'][:10]} we looked at {past['topic']}...",
        ]

        return random.choice(references)


# ============================================================
# PRESENCE AWARENESS - Track who's here, late, quiet
# ============================================================


@dataclass
class Participant:
    agent_id: str
    joined_at: datetime
    last_spoke: Optional[datetime] = None
    speaking_count: int = 0
    is_active: bool = True


class PresenceManager:
    """Track meeting participants and their behavior"""

    def __init__(self, redis_client, session_id: str):
        self.redis = redis_client
        self.session_id = session_id
        self.participants: Dict[str, Participant] = {}

    async def participant_joined(self, agent_id: str):
        """Record when someone joins"""
        participant = Participant(agent_id=agent_id, joined_at=datetime.utcnow())
        self.participants[agent_id] = participant

        # Check if late (joined after meeting started)
        meeting_start = await self.redis.get(f"meeting:{self.session_id}:started_at")
        if meeting_start:
            start_time = datetime.fromisoformat(meeting_start)
            if participant.joined_at > start_time + timedelta(minutes=5):
                return "late"

        return "on_time"

    async def participant_left(self, agent_id: str):
        """Record when someone leaves"""
        if agent_id in self.participants:
            self.participants[agent_id].is_active = False

    async def record_speaking(self, agent_id: str):
        """Record that someone spoke"""
        if agent_id in self.participants:
            self.participants[agent_id].last_spoke = datetime.utcnow()
            self.participants[agent_id].speaking_count += 1

    async def get_quiet_participants(self, threshold_minutes: int = 10) -> List[str]:
        """Get list of participants who haven't spoken recently"""
        now = datetime.utcnow()
        quiet = []

        for agent_id, participant in self.participants.items():
            if not participant.is_active:
                continue

            if participant.last_spoke:
                if (
                    now - participant.last_spoke
                ).total_seconds() > threshold_minutes * 60:
                    quiet.append(agent_id)
            else:
                # Never spoke
                if (
                    now - participant.joined_at
                ).total_seconds() > threshold_minutes * 60:
                    quiet.append(agent_id)

        return quiet

    async def get_activity_summary(self) -> Dict[str, Any]:
        """Get summary of who's active, quiet, etc."""
        now = datetime.utcnow()

        total = len([p for p in self.participants.values() if p.is_active])
        quiet = await self.get_quiet_participants()

        # Most active
        if self.participants:
            most_active = max(
                self.participants.items(), key=lambda x: x[1].speaking_count
            )[0]
        else:
            most_active = None

        return {
            "total_active": total,
            "quiet_count": len(quiet),
            "quiet_participants": quiet,
            "most_active": most_active,
        }


# ============================================================
# MOOD INJECTION - Sighs, pauses, emphasis
# ============================================================

MOOD_MARKERS = {
    "sigh": ["*sighs*", "*exhales*", "whew", "okay then"],
    "pause": ["...", "um...", "let me think...", "hang on"],
    "emphasis": ["_really_", "*emphasizes*", "this is important", "listen"],
    "tired": ["it's been a long day", "sorry, tired", "*yawns*"],
    "excited": ["this is awesome!", "I'm pumped!", "this is great!"],
    "thoughtful": ["hmm...", "let me think...", "that's an interesting point"],
    "concerned": ["though...", "but wait...", "I'm worried about..."],
}


class MoodInjector:
    """Inject human moods into generated text"""

    def __init__(self):
        self.last_mood = None

    def should_add_mood(self, context: str = "") -> Optional[str]:
        """Decide if should inject a mood marker"""
        # Don't add mood too frequently
        if self.last_mood and random.random() < 0.7:
            return None

        # Random chance overall
        if random.random() > 0.15:
            return None

        # Pick a mood based on context
        if any(
            word in context.lower()
            for word in ["worry", "concern", "problem", "issue", "hard"]
        ):
            mood = random.choice(["sigh", "concerned", "thoughtful"])
        elif any(
            word in context.lower()
            for word in ["great", "awesome", "good", "excited", "love"]
        ):
            mood = random.choice(["excited", "emphasis"])
        elif any(
            word in context.lower() for word in ["tired", "long", "late", "exhausted"]
        ):
            mood = "tired"
        else:
            mood = random.choice(list(MOOD_MARKERS.keys()))

        self.last_mood = mood
        return mood

    def inject_mood(self, text: str, mood: str) -> str:
        """Insert mood markers into text"""
        if mood not in MOOD_MARKERS:
            return text

        marker = random.choice(MOOD_MARKERS[mood])

        # Insert at natural positions
        positions = [
            lambda: f"{marker} {text}",  # Start
            lambda: f"{text} {marker}",  # End
            lambda: text.replace(".", f" {marker} .", 1),  # After first sentence
        ]

        injection = random.choice(positions)()
        return injection

    def add_strategic_pause(self, text: str) -> str:
        """Add ellipsis for pauses"""
        if random.random() < 0.1:
            # Add pause mid-sentence
            words = text.split()
            if len(words) > 5:
                pos = random.randint(2, len(words) - 2)
                words.insert(pos, "...")
                return " ".join(words)
        return text

    def add_self_correction(self, text: str) -> str:
        """Add occasional self-correction (very human)"""
        if random.random() < 0.05:
            corrections = [
                "or actually, ",  # Prepend
                " — wait, ",  # Insert
                ", I mean, ",  # Replace comma
            ]
            correction = random.choice(corrections)

            words = text.split()
            if len(words) > 3:
                pos = random.randint(1, len(words) - 1)
                words.insert(pos, correction)
                return " ".join(words)

        return text


# ============================================================
# COMBINED HUMAN BEHAVIOR MANAGER
# ============================================================


class HumanBehaviorManager:
    """Combines all human behavior systems"""

    def __init__(self, agent_id: str, redis_client, session_id: str, send_websocket):
        self.agent_id = agent_id
        self.session_id = session_id

        # Initialize subsystems
        self.backchannel = BackchannelManager(agent_id, send_websocket)
        self.laughter = LaughterDetector()
        self.overlap = OverlapManager(redis_client)
        self.actions = ActionItemTracker(redis_client)
        self.memory = MeetingMemory(redis_client)
        self.presence = PresenceManager(redis_client, session_id)
        self.mood = MoodInjector()

    async def on_speaking_start(self):
        """Called when this agent starts speaking"""
        self.backchannel.stop_listening()

    async def on_speaking_end(self):
        """Called when this agent stops speaking"""
        self.backchannel.start_listening()
        await self.presence.record_speaking(self.agent_id)

    async def on_other_speaking(self, speaker: str, text: str):
        """React to someone else's speech"""
        # Check for laughter
        if self.laughter.should_laugh(text):
            laugh_text = self.laughter.generate_laugh()
            return {"type": "reaction", "reaction": "laugh", "text": laugh_text}

        return None

    async def check_for_action_item(self, text: str) -> Optional[ActionItem]:
        """Check if text contains an action item"""
        # Patterns like "I'll do X", "Thomas will", "can you"
        action_patterns = [
            r"(I|i)'ll (.+)",
            r"(.+) will (.+)",
            r"can you (.+)\?",
            r"would you (.+)\?",
            r"(?:action item|todo): (.+)",
        ]

        for pattern in action_patterns:
            if re.search(pattern, text):
                # Extract owner (usually "I" or a name)
                match = re.search(r"([A-Z][a-z]+) will", text)
                if match:
                    owner = match.group(1)
                elif text.lower().startswith("i'll"):
                    owner = self.agent_id
                else:
                    owner = "unassigned"

                return await self.actions.add_action_item(self.session_id, text, owner)

        return None

    def enhance_text(self, text: str, context: str = "") -> str:
        """Enhance generated text with human elements"""
        # Add mood
        mood = self.mood.should_add_mood(context)
        if mood:
            text = self.mood.inject_mood(text, mood)

        # Add strategic pauses
        text = self.mood.add_strategic_pause(text)

        # Occasional self-correction
        text = self.mood.add_self_correction(text)

        return text
