from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone

import asyncio
import numpy as np
from fastapi import FastAPI, HTTPException, File, UploadFile, Body, Form, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy import text, func
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
import database
import models
import schemas
import auth
from sentence_transformers import SentenceTransformer, util
from transformers import BlipProcessor, BlipForConditionalGeneration

import uvicorn
import torch
from PIL import Image
import io
import os
import base64
import json
import math
import re
import wave
from typing import Optional
from dotenv import load_dotenv
import requests

try:
    from google import genai
    from google.genai import types as genai_types
except ImportError:
    genai = None
    genai_types = None

try:
    import google.generativeai as legacy_genai
except ImportError:
    legacy_genai = None

load_dotenv()

# ── Create uploads directory for storing user photos/audio ──
#
# IMPORTANT FOR AZURE DEPLOYMENT: Azure App Service's local filesystem is not
# guaranteed to persist across restarts, redeploys, or scale events. The
# default below is fine for local development and quick demos, but for a
# production deployment you should either:
#   1. Mount Azure Storage as a persistent file share, and point UPLOADS_DIR
#      at that mount, or
#   2. Migrate to Azure Blob Storage and store blob URLs in the database.
UPLOADS_DIR = os.environ.get(
    "UPLOADS_DIR", os.path.join(os.path.dirname(__file__), "uploads")
)
os.makedirs(UPLOADS_DIR, exist_ok=True)


def save_user_image(
    image: Image.Image, user_id: int, filename: str = "photo.jpg"
) -> str:
    """
    Save image to user-specific directory and return the relative path.
    Directory structure: uploads/user_{user_id}/photo_{timestamp}.jpg
    """
    user_dir = os.path.join(UPLOADS_DIR, f"user_{user_id}")
    os.makedirs(user_dir, exist_ok=True)

    # Generate unique filename with timestamp
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S_%f")[:-3]
    file_ext = os.path.splitext(filename)[1] or ".jpg"
    saved_filename = f"photo_{timestamp}{file_ext}"

    filepath = os.path.join(user_dir, saved_filename)
    image.convert("RGB").save(filepath, "JPEG", quality=85)

    # Return relative path for storage in database
    relative_path = os.path.join("uploads", f"user_{user_id}", saved_filename)
    return relative_path


def save_user_audio(file_bytes: bytes, user_id: int, filename: str = "audio.wav") -> str:
    """Save raw user audio and return a relative path."""
    user_dir = os.path.join(UPLOADS_DIR, f"user_{user_id}")
    os.makedirs(user_dir, exist_ok=True)

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S_%f")[:-3]
    file_ext = os.path.splitext(filename)[1] or ".wav"
    safe_ext = re.sub(r"[^a-zA-Z0-9.]", "", file_ext) or ".wav"
    saved_filename = f"audio_{timestamp}{safe_ext}"

    filepath = os.path.join(user_dir, saved_filename)
    with open(filepath, "wb") as audio_file:
        audio_file.write(file_bytes)

    return os.path.join("uploads", f"user_{user_id}", saved_filename)


app = FastAPI(title="Emotion Mood Analytics Server")

models.Base.metadata.create_all(bind=database.engine)


# Ensure existing SQLite databases are compatible with the current models.
# SQLAlchemy create_all does not alter existing tables, so add any missing columns here.
def ensure_sqlite_schema():
    if database.engine.dialect.name != "sqlite":
        return

    with database.engine.connect() as conn:
        result = conn.execute(text("PRAGMA table_info('mood_logs')"))
        columns = [row[1] for row in result.fetchall()]
        if "image_path" not in columns:
            conn.execute(text("ALTER TABLE mood_logs ADD COLUMN image_path TEXT"))
            print("Added missing image_path column to mood_logs table")
        if "reflection" not in columns:
            conn.execute(text("ALTER TABLE mood_logs ADD COLUMN reflection TEXT"))
            print("Added missing reflection column to mood_logs table")
        if "doodles" not in columns:
            conn.execute(text("ALTER TABLE mood_logs ADD COLUMN doodles TEXT"))
            print("Added missing doodles column to mood_logs table")
        if "gentle_reminder" not in columns:
            conn.execute(text("ALTER TABLE mood_logs ADD COLUMN gentle_reminder TEXT"))
            print("Added missing gentle_reminder column to mood_logs table")
        if "audio_path" not in columns:
            conn.execute(text("ALTER TABLE mood_logs ADD COLUMN audio_path TEXT"))
            print("Added missing audio_path column to mood_logs table")
        if "prosody_analysis" not in columns:
            conn.execute(text("ALTER TABLE mood_logs ADD COLUMN prosody_analysis TEXT"))
            print("Added missing prosody_analysis column to mood_logs table")
        if "embedding" not in columns:
            conn.execute(text("ALTER TABLE mood_logs ADD COLUMN embedding TEXT"))
            print("Added missing embedding column to mood_logs table")


ensure_sqlite_schema()

_cors_origins_env = os.environ.get("CORS_ALLOWED_ORIGINS", "*")
_cors_origins = (
    ["*"]
    if _cors_origins_env.strip() == "*"
    else [o.strip() for o in _cors_origins_env.split(",") if o.strip()]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads directory for serving photos
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# Lazy-load models to avoid multiprocessing conflicts with --reload
vibe_model = None
vision_model = None
caption_processor = None
caption_model = None
label_embeddings = None


def get_vibe_model():
    global vibe_model
    if vibe_model is None:
        print("Loading Sentence Embedding model...")
        vibe_model = SentenceTransformer("all-MiniLM-L6-v2")
    return vibe_model


def get_vision_model():
    global vision_model
    if vision_model is None:
        print("Loading CLIP model for image analysis...")
        vision_model = SentenceTransformer("clip-ViT-B-32")
    return vision_model


def get_caption_models():
    global caption_processor, caption_model
    if caption_processor is None:
        print("Loading BLIP for factual image captioning...")
        caption_processor = BlipProcessor.from_pretrained(
            "Salesforce/blip-image-captioning-base"
        )
        caption_model = BlipForConditionalGeneration.from_pretrained(
            "Salesforce/blip-image-captioning-base"
        )
    return caption_processor, caption_model


def get_label_embeddings():
    global label_embeddings
    if label_embeddings is None:
        print("Computing label embeddings for VIBE_LABELS...")
        label_embeddings = get_vibe_model().encode(VIBE_LABELS, convert_to_tensor=True)
    return label_embeddings, VIBE_LABELS


STATIC_JOURNAL_PROMPTS = {
    "calm": [
        "What helped you arrive at this stillness?",
        "What are you grateful for right now?",
        "How can you protect this feeling today?",
    ],
    "happy": [
        "What specifically made today feel good?",
        "Who would you like to share this joy with?",
        "What does happiness feel like in your body right now?",
    ],
    "energetic": [
        "What are you most excited to tackle today?",
        "How can you channel this energy productively?",
        "What does this surge feel like — where is it coming from?",
    ],
    "sad": [
        "What is this sadness trying to tell you?",
        "Is there something you need to let go of?",
        "What small act of kindness can you offer yourself right now?",
    ],
    "anxious": [
        "What's one thing you can control right now?",
        "What would you say to a friend feeling this way?",
        "Name 3 things you can see from where you are.",
    ],
    "lonely": [
        "What kind of connection are you craving?",
        "Who in your life could you reach out to today?",
        "What does your ideal sense of belonging look like?",
    ],
    "nostalgic": [
        "What from your past are you longing for?",
        "How has that experience shaped who you are?",
        "What part of that past self can you honor today?",
    ],
    "pensive": [
        "What question keeps coming back to you lately?",
        "What are you trying to figure out?",
        "What would happen if you sat with the uncertainty a little longer?",
    ],
    "gloomy": [
        "When did this cloudiness begin?",
        "What would a small ray of light look like for you today?",
        "Is there something heavy you've been carrying alone?",
    ],
    "tense": [
        "What is the source of this tension?",
        "What would release feel like right now?",
        "What's one thing you can let go of today?",
    ],
    "hopeful": [
        "What are you hoping for?",
        "What's one step toward that hope you can take today?",
        "What feels possible that didn't before?",
    ],
    "cozy": [
        "What makes this moment feel safe and warm?",
        "How can you savour this feeling a little longer?",
        "Who or what created this sense of comfort?",
    ],
    "chaotic": [
        "What is the core thing overwhelming you right now?",
        "What's one thing you can remove from your plate?",
        "What does your mind need most — rest, clarity, or movement?",
    ],
}

STATIC_COMPANION_QUESTIONS = {
    "returning_long": [
        "It's been a while — how are you, honestly?",
        "What do you most want to acknowledge about this past stretch?",
        "What brought you back today?",
    ],
    "returning_short": [
        "Welcome back — what's been on your mind?",
        "What's the first thing you want to check in about?",
    ],
    "declining": [
        "Things seem heavier lately. What's been weighing on you?",
        "What would it look like to give yourself some extra care today?",
        "Is there something you've been carrying alone?",
    ],
    "improving": [
        "Something seems to be shifting for the better. What's been different?",
        "Your mood has been lifting — what do you think is driving that?",
    ],
    "earlyMorning": [
        "How did you sleep last night?",
        "What intention are you setting for today?",
    ],
    "morning": [
        "How are you starting your day?",
        "Is there anything you're carrying from yesterday?",
    ],
    "afternoon": [
        "How's your energy holding up today?",
        "Are you getting what you needed from this day?",
    ],
    "evening": [
        "What moment from today stands out to you?",
        "What do you want to let go of before bed?",
    ],
    "night": [
        "What's keeping you up tonight?",
        "How does the quiet feel for you right now?",
    ],
    "default": [
        "How are you feeling right now, in this moment?",
        "What's on your mind today?",
        "What do you need most right now?",
    ],
}

DEFAULT_JOURNAL_PROMPTS = [
    "What's on your mind right now?",
    "How does your body feel in this moment?",
    "What do you need most right now — and how could you give it to yourself?",
]

STATIC_AFFIRMATIONS = {
    "calm": "You have found a quiet center within the noise. Let this stillness anchor you as you move through the day.",
    "peaceful": "There is grace in the peace you carry right now. You are exactly where you need to be.",
    "happy": "Your joy today is real, and it belongs to you. Carry it forward and let it light up the spaces around you.",
    "energetic": "You are a force of momentum right now. Channel this energy toward something that matters to your future self.",
    "sad": "Your pain is not a sign of weakness. Feeling deeply means you are fully alive — and that takes courage.",
    "anxious": "You have navigated uncertainty before and arrived on the other side. You are more capable than your fear suggests.",
    "chaotic": "Chaos is not your natural state — it's a season. You will find your footing again, and you don't have to rush.",
    "gloomy": "Even the heaviest clouds don't last forever. You are allowed to rest under them without pretending they aren't there.",
    "tense": "You are carrying more than you should have to right now. It's okay to set something down — even briefly.",
    "lonely": "Even in solitude, you are not forgotten. The connection you need exists — and you are worthy of it.",
    "nostalgic": "The past you're remembering helped build the person reading this. Honor it, then gently return to the now.",
    "hopeful": "The future you're hoping for is not naïve — it's a compass. Let it guide your next small step.",
    "cozy": "Softness and warmth are not small things — they are restorative. You deserve every moment of this comfort.",
    "melancholic": "Beauty and sadness live side by side in you right now. That bittersweet feeling is deeply human.",
    "pensive": "Your willingness to sit with hard questions is wisdom in action. Not everything needs an answer today.",
}

DEFAULT_AFFIRMATION = "Whatever you're carrying today, you don't have to carry it perfectly. You are doing better than you know."


def pick_static_companion_question(req: schemas.CompanionQuestionRequest) -> str:
    import datetime

    day_index = datetime.date.today().day

    if req.days_away >= 7:
        pool = STATIC_COMPANION_QUESTIONS["returning_long"]
    elif req.days_away >= 2:
        pool = STATIC_COMPANION_QUESTIONS["returning_short"]
    elif req.trend == "declining":
        pool = STATIC_COMPANION_QUESTIONS["declining"]
    elif req.trend == "improving":
        pool = STATIC_COMPANION_QUESTIONS["improving"]
    elif req.time_slot in STATIC_COMPANION_QUESTIONS:
        pool = STATIC_COMPANION_QUESTIONS[req.time_slot]
    else:
        pool = STATIC_COMPANION_QUESTIONS["default"]

    return pool[day_index % len(pool)]


class GeminiClientModel:
    """Small adapter for the current Google GenAI SDK."""

    def __init__(self, api_key: str, model_name: str):
        self.client = genai.Client(api_key=api_key)
        self.model_name = model_name

    def _normalize_content(self, contents):
        if isinstance(contents, list):
            return [self._normalize_part(part) for part in contents]
        return contents

    def _normalize_part(self, part):
        if (
            isinstance(part, dict)
            and part.get("mime_type")
            and part.get("data")
            and genai_types is not None
        ):
            return genai_types.Part.from_bytes(
                data=base64.b64decode(part["data"]),
                mime_type=part["mime_type"],
            )
        return part

    def generate_content(self, contents):
        return self.client.models.generate_content(
            model=self.model_name,
            contents=self._normalize_content(contents),
        )

    def start_chat(self, history=None):
        return GeminiClientChat(self, history or [])


class GeminiClientChat:
    """Minimal chat adapter matching the old SDK shape used by this app."""

    def __init__(self, model: GeminiClientModel, history):
        self.model = model
        self.history = history

    def send_message(self, message: str):
        transcript = []
        for item in self.history:
            role = item.get("role", "user")
            parts = item.get("parts", [])
            text = " ".join(str(part) for part in parts if part)
            if text:
                transcript.append(f"{role}: {text}")
        transcript.append(f"user: {message}")
        return self.model.generate_content("\n\n".join(transcript))


GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
GEMINI_MODEL_NAME = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
if GEMINI_API_KEY and genai is not None:
    gemini_model = GeminiClientModel(GEMINI_API_KEY, GEMINI_MODEL_NAME)
    print(f"Gemini model initialized with Google GenAI SDK: {GEMINI_MODEL_NAME}")
elif GEMINI_API_KEY and legacy_genai is not None:
    legacy_genai.configure(api_key=GEMINI_API_KEY)
    gemini_model = legacy_genai.GenerativeModel(GEMINI_MODEL_NAME)
    print(f"Gemini model initialized with legacy SDK: {GEMINI_MODEL_NAME}")
else:
    print("WARNING: GEMINI_API_KEY/GOOGLE_API_KEY not found or SDK missing. Gemini features will be disabled.")
    gemini_model = None

VIBE_YOUTUBE_QUERIES = {
    "calm": ["calm piano music playlist", "ambient relaxing music"],
    "peaceful": ["peaceful nature sounds music", "zen meditation music"],
    "serene": ["serene acoustic guitar playlist", "peaceful instrumental"],
    "happy": ["happy upbeat playlist 2024", "feel good pop music"],
    "energetic": ["high energy workout music", "pump up EDM playlist"],
    "playful": ["fun indie pop playlist", "playful quirky music"],
    "vibrant": ["vibrant latin music playlist", "upbeat world music"],
    "sad": ["sad indie playlist", "emotional piano music"],
    "lonely": ["lonely night music playlist", "solitary ambient music"],
    "pensive": ["pensive jazz playlist", "thoughtful instrumental music"],
    "gloomy": ["gloomy post-rock playlist", "dark ambient music"],
    "anxious": ["anxiety relief music", "calming music for anxiety"],
    "chaotic": ["chaotic drum and bass", "intense electronic music"],
    "intense": ["intense cinematic music", "powerful orchestral playlist"],
    "gritty": ["gritty blues rock playlist", "raw garage rock"],
    "nostalgic": ["nostalgic 80s playlist", "retro synthwave music"],
    "romantic": ["romantic jazz playlist", "love songs acoustic"],
    "mystical": ["mystical ethereal music", "magical fantasy soundtrack"],
    "vintage": ["vintage jazz cafe playlist", "classic 60s soul music"],
    "cozy": ["cozy coffee shop music", "cozy lo-fi playlist"],
    "ethereal": ["ethereal dream pop playlist", "floating ambient music"],
    "melancholic": ["melancholic classical music", "bittersweet indie folk"],
    "industrial": ["industrial techno playlist", "dark industrial music"],
    "natural": ["nature sounds forest music", "earthy folk music playlist"],
    "futuristic": ["futuristic synthwave playlist", "cyberpunk electronic music"],
    "bold": ["bold hip hop playlist", "powerful trap music"],
    "solitary": ["solitary acoustic music", "lone wolf playlist"],
    "tense": ["tense thriller soundtrack", "suspense music playlist"],
    "hopeful": ["hopeful uplifting music", "morning motivation playlist"],
    "minimalist": ["minimalist piano playlist", "sparse ambient music"],
}

VIBE_META = {
    "calm": {"color": "#A8E6CF", "emoji": "😌"},
    "peaceful": {"color": "#B2E2F2", "emoji": "🕊️"},
    "serene": {"color": "#D4F1F4", "emoji": "🧘"},
    "minimalist": {"color": "#D0D0D0", "emoji": "⚪"},
    "happy": {"color": "#FFDE7D", "emoji": "😊"},
    "energetic": {"color": "#FFD93D", "emoji": "⚡"},
    "playful": {"color": "#FF8B94", "emoji": "🎈"},
    "vibrant": {"color": "#6BCB77", "emoji": "🌈"},
    "sad": {"color": "#A2D2FF", "emoji": "😢"},
    "lonely": {"color": "#6C757D", "emoji": "👤"},
    "pensive": {"color": "#4A4E69", "emoji": "🤔"},
    "gloomy": {"color": "#9A8C98", "emoji": "☁️"},
    "anxious": {"color": "#D4A5A5", "emoji": "😰"},
    "chaotic": {"color": "#E94560", "emoji": "🌀"},
    "intense": {"color": "#FF4D4D", "emoji": "🔥"},
    "gritty": {"color": "#545B64", "emoji": "⛓️"},
    "nostalgic": {"color": "#FFAAA5", "emoji": "📺"},
    "romantic": {"color": "#FFB7B2", "emoji": "❤️"},
    "mystical": {"color": "#9D4EDD", "emoji": "✨"},
    "vintage": {"color": "#B08968", "emoji": "🎞️"},
    "cozy": {"color": "#E6A15C", "emoji": "🕯️"},
    "ethereal": {"color": "#B8C0FF", "emoji": "🌫️"},
    "melancholic": {"color": "#4E6E81", "emoji": "🥀"},
    "industrial": {"color": "#545B64", "emoji": "⚙️"},
    "natural": {"color": "#4A7C59", "emoji": "🌲"},
    "futuristic": {"color": "#00F5D4", "emoji": "🤖"},
    "bold": {"color": "#F15BB5", "emoji": "🏎️"},
    "solitary": {"color": "#8D99AE", "emoji": "🏔️"},
    "tense": {"color": "#D90429", "emoji": "⚠️"},
    "hopeful": {"color": "#FEE440", "emoji": "🌅"},
}

VIBE_LABELS = list(VIBE_META.keys())

YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY")


class MoodRequest(BaseModel):
    text: str
    avatar_config: Optional[dict] = None


def get_current_db_user(
    db: Session = Depends(database.get_db),
    current_user: str = Depends(auth.get_current_user),
):
    db_user = db.query(models.User).filter(models.User.email == current_user).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user


def serialize_mood_log(log: models.MoodLog):
    try:
        scene_tags = json.loads(log.scene_tags or "[]")
    except json.JSONDecodeError:
        scene_tags = []

    try:
        color_palette = json.loads(log.color_palette or "[]")
    except json.JSONDecodeError:
        color_palette = []

    try:
        secondary_moods = json.loads(log.secondary_moods or "[]")
    except json.JSONDecodeError:
        secondary_moods = []

    try:
        all_scores = json.loads(log.all_scores or "[]")
    except json.JSONDecodeError:
        all_scores = []

    try:
        prosody_analysis = json.loads(log.prosody_analysis or "null")
    except json.JSONDecodeError:
        prosody_analysis = None

    return {
        "id": log.id,
        "user_id": log.user_id,
        "vibe": log.vibe,
        "emoji": log.emoji,
        "timestamp": (
            log.timestamp.replace(tzinfo=timezone.utc).isoformat()
            if log.timestamp.tzinfo is None
            else log.timestamp.isoformat()
        ),
        "short_caption": log.short_caption,
        "color": log.color,
        "scene_tags": scene_tags if isinstance(scene_tags, list) else [],
        "description": log.description,
        "feedback": log.feedback,
        "poetic_summary": log.poetic_summary,
        "confidence": log.confidence,
        "gemini_confidence": log.gemini_confidence,
        "environment_type": log.environment_type,
        "color_palette": color_palette,
        "secondary_moods": secondary_moods,
        "all_scores": all_scores,
        "image_path": log.image_path,
        "audio_path": log.audio_path,
        "prosody_analysis": prosody_analysis if isinstance(prosody_analysis, dict) else None,
        "reflection": log.reflection,
        "doodles": log.doodles,
        "gentle_reminder": log.gentle_reminder,
        # never expose raw embedding vector to client
    }


def classify_pace(words_per_minute: Optional[float]) -> str:
    if words_per_minute is None:
        return "unknown"
    if words_per_minute < 95:
        return "slow"
    if words_per_minute > 165:
        return "fast"
    return "steady"


def classify_volume(avg_dbfs: Optional[float]) -> str:
    if avg_dbfs is None:
        return "unknown"
    if avg_dbfs < -35:
        return "quiet"
    if avg_dbfs > -18:
        return "loud"
    return "moderate"


def infer_emotional_tone(
    pace_label: str,
    volume_label: str,
    pause_ratio: float,
    volume_variability: float,
) -> str:
    if pace_label == "fast" and volume_label == "loud":
        return "energized or tense"
    if pace_label == "fast" and pause_ratio < 0.12:
        return "urgent or animated"
    if pace_label == "slow" and pause_ratio > 0.28:
        return "hesitant or reflective"
    if volume_label == "quiet" and pace_label == "slow":
        return "subdued"
    if volume_variability > 9 and pause_ratio > 0.2:
        return "emotionally strained"
    if pace_label == "steady" and volume_label == "moderate":
        return "balanced"
    return "mixed"


def pcm_sample_to_int(sample: bytes, sample_width: int) -> int:
    if sample_width == 1:
        return sample[0] - 128
    return int.from_bytes(sample, byteorder="little", signed=True)


def int_to_pcm_sample(value: int, sample_width: int) -> bytes:
    min_value = -(1 << (8 * sample_width - 1))
    max_value = (1 << (8 * sample_width - 1)) - 1
    clamped = max(min(value, max_value), min_value)
    if sample_width == 1:
        return bytes([clamped + 128])
    return clamped.to_bytes(sample_width, byteorder="little", signed=True)


def pcm_to_mono(frames: bytes, sample_width: int, channels: int) -> bytes:
    if channels <= 1:
        return frames

    frame_width = sample_width * channels
    mono_frames = bytearray()

    for offset in range(0, len(frames) - frame_width + 1, frame_width):
        frame = frames[offset : offset + frame_width]
        samples = [
            pcm_sample_to_int(
                frame[channel_offset : channel_offset + sample_width],
                sample_width,
            )
            for channel_offset in range(0, frame_width, sample_width)
        ]
        mono_sample = round(sum(samples) / channels)
        mono_frames.extend(int_to_pcm_sample(mono_sample, sample_width))

    return bytes(mono_frames)


def pcm_rms(frames: bytes, sample_width: int) -> int:
    sample_count = len(frames) // sample_width
    if sample_count == 0:
        return 0

    square_sum = 0
    for offset in range(0, sample_count * sample_width, sample_width):
        sample = frames[offset : offset + sample_width]
        value = pcm_sample_to_int(sample, sample_width)
        square_sum += value * value

    return int(math.sqrt(square_sum / sample_count))


def analyze_wav_prosody(file_bytes: bytes, transcript: Optional[str] = None) -> dict:
    """
    Lightweight local prosody analysis for PCM WAV audio.
    Pace needs a transcript or word count, while pauses/volume come from audio energy.
    """
    with wave.open(io.BytesIO(file_bytes), "rb") as wav_file:
        channels = wav_file.getnchannels()
        sample_width = wav_file.getsampwidth()
        frame_rate = wav_file.getframerate()
        frame_count = wav_file.getnframes()
        frames = wav_file.readframes(frame_count)

    if sample_width not in (1, 2, 3, 4):
        raise ValueError("Unsupported WAV sample width")

    if channels > 1:
        frames = pcm_to_mono(frames, sample_width, channels)

    duration_seconds = frame_count / frame_rate if frame_rate else 0
    if duration_seconds <= 0:
        raise ValueError("Audio duration is empty")

    window_ms = 50
    window_bytes = max(sample_width, int(frame_rate * window_ms / 1000) * sample_width)
    rms_values = []

    for offset in range(0, len(frames), window_bytes):
        chunk = frames[offset : offset + window_bytes]
        if len(chunk) >= sample_width:
            rms_values.append(pcm_rms(chunk, sample_width))

    if not rms_values:
        raise ValueError("Audio did not contain readable samples")

    max_possible = float(1 << (8 * sample_width - 1))
    avg_rms = sum(rms_values) / len(rms_values)
    peak_rms = max(rms_values)
    avg_dbfs = 20 * math.log10(max(avg_rms, 1) / max_possible)
    peak_dbfs = 20 * math.log10(max(peak_rms, 1) / max_possible)

    mean_rms = avg_rms
    variance = sum((value - mean_rms) ** 2 for value in rms_values) / len(rms_values)
    std_rms = math.sqrt(variance)
    volume_variability_db = 20 * math.log10((mean_rms + std_rms + 1) / (mean_rms + 1))

    silence_threshold = max(80, peak_rms * 0.06, avg_rms * 0.35)
    silent_windows = [value <= silence_threshold for value in rms_values]
    pause_segments = []
    current_start = None

    for index, is_silent in enumerate(silent_windows):
        if is_silent and current_start is None:
            current_start = index
        elif not is_silent and current_start is not None:
            pause_seconds = (index - current_start) * window_ms / 1000
            if pause_seconds >= 0.35:
                pause_segments.append(
                    {
                        "start_seconds": round(current_start * window_ms / 1000, 2),
                        "duration_seconds": round(pause_seconds, 2),
                    }
                )
            current_start = None

    if current_start is not None:
        pause_seconds = (len(silent_windows) - current_start) * window_ms / 1000
        if pause_seconds >= 0.35:
            pause_segments.append(
                {
                    "start_seconds": round(current_start * window_ms / 1000, 2),
                    "duration_seconds": round(pause_seconds, 2),
                }
            )

    pause_total = sum(item["duration_seconds"] for item in pause_segments)
    pause_ratio = min(1.0, pause_total / duration_seconds)
    words = re.findall(r"\b[\w']+\b", transcript or "")
    word_count = len(words)
    words_per_minute = (
        round(word_count / duration_seconds * 60, 1)
        if word_count > 0 and duration_seconds > 0
        else None
    )
    pace_label = classify_pace(words_per_minute)
    volume_label = classify_volume(avg_dbfs)

    return {
        "duration_seconds": round(duration_seconds, 2),
        "pace": {
            "words_per_minute": words_per_minute,
            "label": pace_label,
            "word_count": word_count,
            "note": "Pace uses transcript word count when provided.",
        },
        "pauses": {
            "count": len(pause_segments),
            "total_seconds": round(pause_total, 2),
            "pause_ratio": round(pause_ratio, 2),
            "segments": pause_segments[:12],
        },
        "volume": {
            "average_dbfs": round(avg_dbfs, 1),
            "peak_dbfs": round(peak_dbfs, 1),
            "variability_db": round(volume_variability_db, 1),
            "label": volume_label,
        },
        "emotional_tone": {
            "label": infer_emotional_tone(
                pace_label, volume_label, pause_ratio, volume_variability_db
            ),
            "confidence": "low",
            "note": "Estimated from pace, pause density, and volume. It is not a clinical assessment.",
        },
        "source": "local_wav_energy_analysis",
    }


COLOR_NAMES = {
    "#FDDBB4": "warm fair skin",
    "#F1A97A": "golden tan skin",
    "#C68642": "deep bronze skin",
    "#8D5524": "rich brown skin",
    "#4A2912": "deep dark brown skin",
    "#1a0a00": "black hair",
    "#4B3621": "dark brown hair",
    "#8B5E3C": "chestnut brown hair",
    "#D4A04A": "golden blond hair",
    "#F5C5A3": "soft peach-pink hair",
    "#C0392B": "red hair",
    "#8E44AD": "violet hair",
    "#2980B9": "blue hair",
    "#2c3e50": "dark slate eyes",
    "#1a6b3c": "green eyes",
    "#6B4226": "brown eyes",
    "#1e90ff": "bright blue eyes",
    "#808080": "gray eyes",
}

STYLE_NAMES = {
    "long_straight": "long straight hair",
    "long_wavy": "long wavy hair",
    "bun": "hair gathered in a bun",
    "ponytail": "hair tied in a ponytail",
    "short_bob": "a short bob haircut",
    "short_side": "short side-parted hair",
    "short_curly": "short curly hair",
    "buzz": "a close buzz cut",
    "messy": "messy tousled hair",
    "slick": "slicked-back hair",
    "normal": "steady, observant eyes",
    "happy": "warm, smiling eyes",
    "wink": "a playful wink",
    "sleepy": "heavy, sleepy eyes",
    "surprised": "wide, surprised eyes",
    "smile": "a soft smile",
    "big_smile": "a bright open smile",
    "neutral": "a calm neutral mouth",
    "smirk": "a small knowing smirk",
    "open": "a slightly open, expressive mouth",
    "round": "round glasses",
    "square": "square glasses",
    "cat_eye": "cat-eye glasses",
    "sunglasses": "dark sunglasses",
    "earrings": "small gold earrings",
    "necklace": "a delicate necklace",
    "bow": "a bow in their hair",
    "headband": "a headband",
    "cap": "a blue cap",
}


def describe_avatar(avatar_config: Optional[dict]) -> str:
    """Convert the avatar builder config into prose the story prompt can use."""
    if not avatar_config:
        return "an unspecified person"

    gender = avatar_config.get("gender", "person")
    person = (
        "young woman"
        if gender == "girl"
        else "young man" if gender == "boy" else "person"
    )
    skin = COLOR_NAMES.get(avatar_config.get("skinTone"), "")
    hair_color = COLOR_NAMES.get(avatar_config.get("hairColor"), "")
    hair_style = STYLE_NAMES.get(avatar_config.get("hairStyle"), "")
    eyes = COLOR_NAMES.get(avatar_config.get("eyeColor"), "expressive eyes")
    eye_style = STYLE_NAMES.get(avatar_config.get("eyeStyle"), "")
    mouth = STYLE_NAMES.get(avatar_config.get("mouthStyle"), "")
    glasses = STYLE_NAMES.get(avatar_config.get("glasses"), "")
    accessory = STYLE_NAMES.get(avatar_config.get("accessories"), "")

    traits = [skin, hair_color, hair_style, eyes, eye_style, mouth, glasses, accessory]
    traits = [trait for trait in traits if trait]

    if not traits:
        return f"a {person}"

    return f"a {person} with " + ", ".join(traits)


def pil_to_gemini_part(image: Image.Image) -> dict:
    buf = io.BytesIO()
    image.convert("RGB").save(buf, format="JPEG", quality=85)
    return {
        "mime_type": "image/jpeg",
        "data": base64.b64encode(buf.getvalue()).decode("utf-8"),
    }


def generate_local_caption(image: Image.Image) -> str:
    """Generates a factual description of the image using a local BLIP model."""
    try:
        caption_processor, caption_model = get_caption_models()
        inputs = caption_processor(image, return_tensors="pt")
        out = caption_model.generate(**inputs)
        caption = caption_processor.decode(out[0], skip_special_tokens=True)
        return caption.capitalize()
    except Exception as e:
        print(f"Local captioning failed: {e}")
        return "A scene with visual details."


def build_enriched_scores_from_bert(text: str):
    """Run BERT over text and return all sorted vibe scores."""
    embedding = get_vibe_model().encode(text, convert_to_tensor=True)
    cosine_scores = util.cos_sim(embedding, get_label_embeddings()[0])[0]
    sorted_indices = torch.argsort(cosine_scores, descending=True)

    labels = [VIBE_LABELS[idx] for idx in sorted_indices]
    scores = [cosine_scores[idx].item() for idx in sorted_indices]

    return labels, scores


@app.post("/analyze-mood")
async def analyze_mood(
    request: MoodRequest, current_user: str = Depends(auth.get_current_user)
):
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    try:
        if gemini_model:
            try:
                description, structured = await run_advanced_text_analysis(
                    request.text,
                    request.avatar_config,
                )
                dominant = structured.get("dominant_mood", "")
                vibe = (
                    dominant
                    if dominant in VIBE_LABELS
                    else VIBE_LABELS[
                        torch.argmax(
                            util.cos_sim(
                                get_vibe_model().encode(
                                    description, convert_to_tensor=True
                                ),
                                get_label_embeddings()[0],
                            )[0]
                        ).item()
                    ]
                )
                return build_full_response(vibe, description, structured)

            except Exception as ge:
                print(f"[Gemini Text Analysis ERROR] {type(ge).__name__}: {ge}")
                # Fallback to BERT
                labels, scores = build_enriched_scores_from_bert(request.text)
                return build_full_response(labels[0], request.text, None)
        else:
            # Fallback to BERT if Gemini is disabled
            labels, scores = build_enriched_scores_from_bert(request.text)
            return build_full_response(labels[0], request.text, None)

    except Exception as e:
        print(f"Error during analysis: {e}")
        raise HTTPException(status_code=500, detail="Error analyzing mood")


# ─────────────────────────────────────────────────────────
# ADVANCED Multi-Stage Gemini Narrative Expansion
# ─────────────────────────────────────────────────────────

@app.post("/analyze-audio-prosody")
async def analyze_audio_prosody(
    file: UploadFile = File(...),
    transcript: Optional[str] = Form(None),
    db_user: models.User = Depends(get_current_db_user),
):
    """
    Save raw audio and return local prosody metrics.
    Currently supports PCM WAV without external dependencies.
    """
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Audio file cannot be empty")

    filename = file.filename or "audio.wav"
    audio_path = save_user_audio(file_bytes, db_user.id, filename)

    try:
        prosody = analyze_wav_prosody(file_bytes, transcript)
    except wave.Error as exc:
        return {
            "audio_path": audio_path,
            "prosody_analysis": {
                "supported": False,
                "source": "saved_audio_only",
                "error": "Prosody analysis currently supports PCM WAV audio.",
                "detail": str(exc),
            },
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        print(f"[Prosody Analysis ERROR] {type(exc).__name__}: {exc}")
        raise HTTPException(status_code=500, detail="Error analyzing audio prosody")

    prosody["supported"] = True
    return {
        "audio_path": audio_path,
        "prosody_analysis": prosody,
    }


TEXT_STAGE1_PROMPT = """You are an expert cinematic storyteller and emotional architect. Take the following brief input text and expand it into a rich, multi-paragraph narrative (2-3 paragraphs) that captures the deep emotional landscape, the surrounding environment, and the visceral atmosphere of this moment.

The input text is: "{text}"

The main character in this scene is: {avatar_description}

Focus on these pillars:
1. THE CHARACTER: Describe how this specific person moves and looks within the environment. Integrate their physical traits naturally into the prose without listing them.
2. THE INNER WORLD: Expand on the emotions mentioned or implied. Describe the internal state of the person in the scene, their thoughts, their breath, their unspoken feelings.
3. THE PHYSICAL SETTING: Based on the input, imagine a detailed environment. Describe the architecture, the textures (e.g., "cold damp pavement", "velvet curtains"), and the time of day.
4. LIGHT & ATMOSPHERE: Describe how light plays in this imagined space. Is it flickering neon, a dying sunset, or harsh overhead fluorescent? What is the "temperature" of the scene?
5. THE NARRATIVE ARC: What led to this moment? What is the lingering tension? Sound like a novelist describing a pivotal frame in a story.

Rules:
- Write exactly 2-3 paragraphs.
- Write in present tense.
- Use the input text as the core seed, but bloom it into a full scene.
- Make the main character match the avatar description when one is provided.
- Never say "the text says" or "I think".
- Be evocative, literary, and cinematic."""

STAGE1_PROMPT = """You are an expert visual analyst and cinematic storyteller. Look at this image and write a rich, multi-paragraph narrative (2–3 paragraphs) that captures both the physical reality and the emotional soul of the scene.

Focus on these pillars:
1. THE SUBJECT & MOOD: Who or what is the focus? Describe their expression, posture, or state of being in detail. If it's a person, what does their gaze or body language say about their inner world?
2. THE ENVIRONMENT: Describe the setting in depth. Is it indoor, outdoor, urban, or natural? Mention the architecture, weather, and specific textures (e.g., "weathered brick", "sleek glass", "soft moss"). 
3. LIGHT & COLOR: How does the light hit the scene? Describe the time of day, shadows, and the emotional impact of the color palette (e.g., "warm golden hues", "stark clinical whites", "deep moody shadows").
4. THE ATMOSPHERE & NARRATIVE: What is the overall "feeling" of this world? What happened just before this moment, or what is about to happen? Sound like a novelist describing a pivotal frame in a story.

Rules:
- Write exactly 2-3 paragraphs.
- Write in present tense.
- Be specific: describe actual details visible.
- Never say "the image shows" or "I see".
- Be evocative, literary, and cinematic."""

STAGE2_PROMPT_TEMPLATE = """You are a mood and environment intelligence engine. Based on this image description:

"{description}"

And these valid mood labels: {labels}

Return ONLY a valid JSON object in this exact format:
{{
  "dominant_mood": "<single label from the list>",
  "confidence": <float 0.0 to 1.0>,
  "environment_type": "<2-3 words describing the setting, e.g., 'Cozy Library', 'Industrial Wasteland', 'Morning Forest'>",
  "secondary_moods": [
    {{"label": "<label>", "score": <float>}},
    {{"label": "<label>", "score": <float>}},
    {{"label": "<label>", "score": <float>}}
  ],
  "color_palette": ["<hex1>", "<hex2>", "<hex3>"],
  "poetic_summary": "<one sentence written in second person: the visceral feeling of being in this scene>",
  "short_caption": "<one sentence describing the literal scene, e.g., 'A person standing in front of a colorful wall'>",
  "scene_tags": ["<tag1>", "<tag2>", "<tag3>"]
}}"""


async def run_advanced_gemini_analysis(image: Image.Image):
    """
    Two-stage Gemini pipeline:
    Stage 1: Get a rich, evocative scene description.
    Stage 2: Extract structured mood JSON from that description.
    Returns (description, structured_result_dict) or raises on failure.
    """
    image_part = pil_to_gemini_part(image)

    # ── Stage 1: Scene Description ──
    stage1_response = await asyncio.to_thread(
        gemini_model.generate_content,
        [STAGE1_PROMPT, image_part],
    )
    description = stage1_response.text.strip()
    print(f"[Stage 1 Description] {description}")

    # ── Stage 2: Structured Mood Extraction ──
    stage2_prompt = STAGE2_PROMPT_TEMPLATE.format(
        description=description,
        labels=", ".join(VIBE_LABELS),
    )
    stage2_response = await asyncio.to_thread(
        gemini_model.generate_content,
        stage2_prompt,
    )
    raw_json = stage2_response.text.strip()

    # Strip any accidental markdown fences
    if raw_json.startswith("```"):
        raw_json = raw_json.split("```")[1]
        if raw_json.startswith("json"):
            raw_json = raw_json[4:]
    raw_json = raw_json.strip()

    structured = json.loads(raw_json)
    print(f"[Stage 2 Structured] {structured}")
    return description, structured


async def run_advanced_text_analysis(text: str, avatar_config: Optional[dict] = None):
    """
    Two-stage Gemini pipeline for text:
    Stage 1: Expand brief text into a rich narrative.
    Stage 2: Extract structured mood JSON from that narrative.
    """
    # ── Stage 1: Narrative Expansion ──
    avatar_description = describe_avatar(avatar_config)
    stage1_prompt = TEXT_STAGE1_PROMPT.format(
        text=text,
        avatar_description=avatar_description,
    )
    stage1_response = await asyncio.to_thread(
        gemini_model.generate_content,
        stage1_prompt,
    )
    description = stage1_response.text.strip()
    print(f"[Text Stage 1 Narrative] {description}")

    # ── Stage 2: Structured Mood Extraction ──
    stage2_prompt = STAGE2_PROMPT_TEMPLATE.format(
        description=description,
        labels=", ".join(VIBE_LABELS),
    )
    stage2_response = await asyncio.to_thread(
        gemini_model.generate_content,
        stage2_prompt,
    )
    raw_json = stage2_response.text.strip()

    # Strip any accidental markdown fences
    if raw_json.startswith("```"):
        raw_json = raw_json.split("```")[1]
        if raw_json.startswith("json"):
            raw_json = raw_json[4:]
    raw_json = raw_json.strip()

    structured = json.loads(raw_json)
    print(f"[Text Stage 2 Structured] {structured}")
    return description, structured


def build_full_response(vibe: str, description: str, structured: Optional[dict] = None):
    """
    Merges Gemini structured output + BERT scores into a unified response
    that the existing MoodResult component can render.
    """
    # Run BERT on the description for the full 20-label breakdown
    bert_labels, bert_scores = build_enriched_scores_from_bert(description)

    # Use Gemini's dominant mood if valid, else fall back to BERT top result
    dominant_label = vibe if vibe in VIBE_LABELS else bert_labels[0]
    dominant_meta = VIBE_META.get(
        dominant_label, {"color": "#808080", "emoji": "🌈", "feedback": "Unique vibe!"}
    )
    dominant_color = dominant_meta.get("color", "#808080")
    dominant_emoji = dominant_meta.get("emoji", "🌈")
    dominant_feedback = dominant_meta.get(
        "feedback", f"This moment carries a {dominant_label} energy."
    )

    # Build the all_scores list from BERT (full 20 labels)
    bert_enriched = [
        {
            "label": label,
            "score": score,
            "percentage": f"{round(score * 100, 1)}%",
            "color": VIBE_META.get(label, {}).get("color", "#808080"),
            "emoji": VIBE_META.get(label, {}).get("emoji", "🌈"),
        }
        for label, score in zip(bert_labels, bert_scores)
    ]

    # Determine a short version for the input field
    short_desc = ""
    if structured and structured.get("short_caption"):
        short_desc = structured.get("short_caption")
    elif structured and structured.get("poetic_summary"):
        short_desc = structured.get("poetic_summary")
    else:
        # Fallback: take first sentence or first 100 chars
        sentences = description.split(". ")
        if sentences:
            short_desc = (
                sentences[0] + "." if not sentences[0].endswith(".") else sentences[0]
            )
            # Safety cap for short description
            if len(short_desc) > 150:
                short_desc = short_desc[:147] + "..."
        else:
            short_desc = description[:100] + "..."

    response = {
        "vibe": dominant_label,
        "description": description,
        "short_description": short_desc,
        "mood": dominant_label,
        "confidence": f"{round(bert_scores[bert_labels.index(dominant_label)] * 100, 2)}%",
        "emoji": dominant_emoji,
        "color": dominant_color,
        "feedback": dominant_feedback,
        "all_scores": bert_enriched,
    }

    # Attach Gemini extras if available
    if structured:
        response["gemini_confidence"] = structured.get("confidence")
        response["poetic_summary"] = structured.get("poetic_summary", "")
        response["short_caption"] = structured.get("short_caption", "")
        response["color_palette"] = structured.get("color_palette", [])
        response["scene_tags"] = structured.get("scene_tags", [])
        response["secondary_moods"] = structured.get("secondary_moods", [])
        response["environment_type"] = structured.get(
            "environment_type", "Unknown Setting"
        )

    return response


@app.post("/analyze-image")
async def analyze_image(
    file: Optional[UploadFile] = File(None),
    base64_data: Optional[str] = Form(None, alias="base64"),
    imageUrl: Optional[str] = Form(None),
    fileName: Optional[str] = Form("photo.jpg"),
    image_type: Optional[str] = Form("image/jpeg", alias="type"),
    db: Session = Depends(database.get_db),
    db_user: models.User = Depends(get_current_db_user),
):
    image = None
    image_path = None

    try:
        # ── 1. Receive the image ──
        if file is not None and file.filename:
            if not file.content_type.startswith("image/"):
                raise HTTPException(
                    status_code=400, detail="File provided is not an image"
                )
            image = Image.open(io.BytesIO(await file.read()))

        elif base64_data:
            try:
                image = Image.open(io.BytesIO(base64.b64decode(base64_data)))
            except Exception:
                raise HTTPException(
                    status_code=400, detail="Invalid base64 image payload"
                )

        elif imageUrl:
            try:
                resp = requests.get(imageUrl, timeout=30)
                resp.raise_for_status()
                image = Image.open(io.BytesIO(resp.content))
            except Exception as e:
                raise HTTPException(
                    status_code=400, detail=f"Failed to fetch image from URL: {str(e)}"
                )

        else:
            raise HTTPException(status_code=400, detail="No image provided")

        # ── Save image to user's directory ──
        try:
            image_path = save_user_image(image, db_user.id, fileName)
        except Exception as e:
            print(f"[Image Save Error] {e}")
            image_path = None

        # ── 2. Advanced Gemini pipeline ──
        if gemini_model:
            try:
                description, structured = await run_advanced_gemini_analysis(image)
                dominant = structured.get("dominant_mood", "")
                vibe = (
                    dominant
                    if dominant in VIBE_LABELS
                    else VIBE_LABELS[
                        torch.argmax(
                            util.cos_sim(
                                get_vibe_model().encode(
                                    description, convert_to_tensor=True
                                ),
                                get_label_embeddings()[0],
                            )[0]
                        ).item()
                    ]
                )
                response = build_full_response(vibe, description, structured)
                response["image_path"] = image_path
                return response

            except json.JSONDecodeError as je:
                # Stage 2 JSON parse failed — fall back to BERT on Stage 1 description
                print(f"[Stage 2 JSON Error] {je} — falling back to BERT")
                bert_labels, _ = build_enriched_scores_from_bert(description)
                response = build_full_response(bert_labels[0], description, None)
                response["image_path"] = image_path
                return response

            except Exception as ge:
                print(f"[Gemini ERROR] {type(ge).__name__}: {ge}")
                print("[Fallback] Using Local BLIP for factual description...")

                # 1. Get Factual Caption
                description = generate_local_caption(image)

                # 2. Extract Vibe from that caption (using BERT)
                bert_labels, _ = build_enriched_scores_from_bert(description)
                vibe = bert_labels[0]

                response = build_full_response(vibe, description, None)
                response["image_path"] = image_path
                return response

        else:
            # No Gemini key — Use Local BLIP for factual description
            print("[No Gemini] Using Local BLIP for factual description...")
            description = generate_local_caption(image)
            bert_labels, _ = build_enriched_scores_from_bert(description)
            vibe = bert_labels[0]
            response = build_full_response(vibe, description, None)
            response["image_path"] = image_path
            return response

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Image analysis error] {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail="Error processing image")


@app.post("/signup", response_model=schemas.Token)
def signup(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(
        email=user.email,
        name=user.name,
        hashed_password=hashed_password,
        avatar_config=user.avatar_config,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    access_token = auth.create_access_token(data={"sub": new_user.email})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_name": new_user.name,
        "avatar_config": new_user.avatar_config,
    }


@app.post("/login", response_model=schemas.Token)
def login(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if not db_user or not auth.verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access_token = auth.create_access_token(data={"sub": db_user.email})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_name": db_user.name,
        "avatar_config": db_user.avatar_config,
    }


@app.put("/update-avatar")
async def update_avatar(
    avatar_config: dict = Body(...),
    db: Session = Depends(database.get_db),
    current_user: str = Depends(auth.get_current_user),
):
    db_user = db.query(models.User).filter(models.User.email == current_user).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    db_user.avatar_config = json.dumps(avatar_config)
    db.commit()
    return {"message": "Avatar updated successfully"}


@app.post("/mood-log", response_model=schemas.MoodLog)
def create_mood_log(
    mood_log: schemas.MoodLogCreate,
    db: Session = Depends(database.get_db),
    db_user: models.User = Depends(get_current_db_user),
):
    vibe = mood_log.vibe.strip()
    short_caption = mood_log.short_caption.strip()
    color = mood_log.color.strip()

    if not vibe:
        raise HTTPException(status_code=400, detail="Vibe cannot be empty")
    if not short_caption:
        raise HTTPException(status_code=400, detail="Short caption cannot be empty")
    if not color:
        raise HTTPException(status_code=400, detail="Color cannot be empty")

    scene_tags = [str(tag).strip() for tag in mood_log.scene_tags if str(tag).strip()]

    timestamp_value = mood_log.timestamp or datetime.now(timezone.utc)
    duplicate_log = (
        db.query(models.MoodLog)
        .filter(
            models.MoodLog.user_id == db_user.id,
            models.MoodLog.vibe == vibe,
            models.MoodLog.short_caption == short_caption,
            func.date(models.MoodLog.timestamp) == timestamp_value.date().isoformat(),
        )
        .first()
    )

    if duplicate_log:
        return serialize_mood_log(duplicate_log)

    new_log = models.MoodLog(
        user_id=db_user.id,
        vibe=vibe,
        emoji=mood_log.emoji,
        timestamp=timestamp_value,
        short_caption=short_caption,
        color=color,
        scene_tags=json.dumps(scene_tags),
        image_path=mood_log.image_path,
        audio_path=mood_log.audio_path,
        description=mood_log.description,
        feedback=mood_log.feedback,
        poetic_summary=mood_log.poetic_summary,
        confidence=mood_log.confidence,
        gemini_confidence=mood_log.gemini_confidence,
        environment_type=mood_log.environment_type,
        color_palette=json.dumps(mood_log.color_palette),
        secondary_moods=json.dumps(mood_log.secondary_moods),
        all_scores=json.dumps(mood_log.all_scores),
        prosody_analysis=(
            json.dumps(mood_log.prosody_analysis)
            if mood_log.prosody_analysis is not None
            else None
        ),
        reflection=mood_log.reflection,
        doodles=mood_log.doodles,
        gentle_reminder=mood_log.gentle_reminder,
    )
    db.add(new_log)
    db.commit()
    db.refresh(new_log)

    return serialize_mood_log(new_log)


@app.put("/mood-log/{log_id}/journal", response_model=schemas.MoodLog)
def update_mood_log_journal(
    log_id: int,
    journal: schemas.MoodJournalUpdate,
    db: Session = Depends(database.get_db),
    db_user: models.User = Depends(get_current_db_user),
):
    log = (
        db.query(models.MoodLog)
        .filter(
            models.MoodLog.id == log_id,
            models.MoodLog.user_id == db_user.id,
        )
        .first()
    )

    if not log:
        raise HTTPException(status_code=404, detail="Mood log not found")

    log.reflection = journal.reflection
    log.doodles = journal.doodles
    if journal.gentle_reminder is not None:
        log.gentle_reminder = journal.gentle_reminder

    db.commit()
    db.refresh(log)

    return serialize_mood_log(log)


@app.delete("/mood-log/{log_id}", status_code=204)
def delete_mood_log(
    log_id: int,
    db: Session = Depends(database.get_db),
    db_user: models.User = Depends(get_current_db_user),
):
    """Delete a single mood log entry. Returns 404 if not found or not owned by user."""
    log = (
        db.query(models.MoodLog)
        .filter(
            models.MoodLog.id == log_id,
            models.MoodLog.user_id == db_user.id,
        )
        .first()
    )

    if not log:
        raise HTTPException(status_code=404, detail="Mood log not found")

    # Optionally clean up the associated image file from disk
    if log.image_path:
        try:
            full_path = os.path.join(os.path.dirname(__file__), log.image_path)
            if os.path.isfile(full_path):
                os.remove(full_path)
        except Exception as e:
            print(f"[Image cleanup warning] {e}")

    db.delete(log)
    db.commit()
    # 204 No Content — no body returned


@app.get("/mood-history", response_model=schemas.MoodHistoryResponse)
def get_mood_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(
        None, description="Filter by vibe name or caption text"
    ),
    db: Session = Depends(database.get_db),
    db_user: models.User = Depends(get_current_db_user),
):
    query = db.query(models.MoodLog).filter(models.MoodLog.user_id == db_user.id)

    # ── Search filter ──
    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        from sqlalchemy import func, or_

        query = query.filter(
            or_(
                func.lower(models.MoodLog.vibe).like(term),
                func.lower(models.MoodLog.short_caption).like(term),
            )
        )

    total = query.count()
    offset = (page - 1) * page_size
    logs = (
        query.order_by(models.MoodLog.timestamp.desc(), models.MoodLog.id.desc())
        .offset(offset)
        .limit(page_size)
        .all()
    )

    return {
        "items": [serialize_mood_log(log) for log in logs],
        "page": page,
        "page_size": page_size,
        "total": total,
        "has_more": offset + len(logs) < total,
    }


@app.get("/user-photos")
def get_user_photos(
    db: Session = Depends(database.get_db),
    db_user: models.User = Depends(get_current_db_user),
):
    """Get all photos uploaded by the current user with their associated mood logs."""
    logs_with_photos = (
        db.query(models.MoodLog)
        .filter(
            models.MoodLog.user_id == db_user.id,
            models.MoodLog.image_path.isnot(None),
        )
        .order_by(models.MoodLog.timestamp.desc())
        .all()
    )

    photos = [
        {
            "mood_log_id": log.id,
            "image_path": log.image_path,
            "vibe": log.vibe,
            "emoji": log.emoji,
            "short_caption": log.short_caption,
            "timestamp": log.timestamp.isoformat() if log.timestamp else None,
            "color": log.color,
        }
        for log in logs_with_photos
    ]

    return {"photos": photos, "total": len(photos)}


@app.get("/analytics/me")
def get_analytics(
    days: int = Query(7, ge=1, le=365),
    db: Session = Depends(database.get_db),
    db_user: models.User = Depends(get_current_db_user),
):
    try:
        user_id = db_user.id

        since = datetime.now(timezone.utc) - timedelta(days=days)
        entries = (
            db.query(models.MoodLog)
            .filter(
                models.MoodLog.user_id == user_id,
                models.MoodLog.timestamp >= since,
            )
            .order_by(models.MoodLog.timestamp.asc(), models.MoodLog.id.asc())
            .all()
        )

        mood_counts = Counter(entry.vibe for entry in entries)
        daily_counts = defaultdict(Counter)

        # Calculate vibe scores
        vibe_score_sums = defaultdict(float)
        vibe_score_counts = defaultdict(int)
        for entry in entries:
            if entry.all_scores:
                try:
                    scores = json.loads(entry.all_scores)
                    for score_item in scores:
                        if (
                            isinstance(score_item, dict)
                            and "label" in score_item
                            and "score" in score_item
                        ):
                            vibe = score_item["label"]
                            score = float(score_item["score"])
                            vibe_score_sums[vibe] += score
                            vibe_score_counts[vibe] += 1
                except (json.JSONDecodeError, ValueError):
                    pass

        vibe_scores = {}
        for vibe in vibe_score_sums:
            vibe_scores[vibe] = (
                vibe_score_sums[vibe] / vibe_score_counts[vibe]
                if vibe_score_counts[vibe] > 0
                else 0
            )

        for entry in entries:
            if entry.timestamp is None:
                continue
            day = entry.timestamp.date().isoformat()
            daily_counts[day][entry.vibe] += 1

        daily_breakdown = [
            {
                "date": day,
                "total_entries": sum(counts.values()),
                "mood_frequency": dict(counts),
                "most_common": counts.most_common(1)[0][0] if counts else None,
            }
            for day, counts in sorted(daily_counts.items())
        ]

        return {
            "total_entries": len(entries),
            "date_range_days": days,
            "mood_frequency": dict(mood_counts),
            "vibe_scores": vibe_scores,
            "most_common": mood_counts.most_common(1)[0][0] if mood_counts else None,
            "daily_breakdown": daily_breakdown,
        }
    except Exception as e:
        print(f"Analytics endpoint error: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to load analytics: {str(e)}"
        )


def parse_goal_vibes(stored_vibe: str) -> list[str]:
    if not stored_vibe:
        return []
    try:
        parsed = json.loads(stored_vibe)
        if isinstance(parsed, list):
            return [
                str(vibe).strip().lower()
                for vibe in parsed
                if str(vibe or "").strip()
            ][:3]
    except (TypeError, json.JSONDecodeError):
        pass
    return [stored_vibe.strip().lower()]


@app.get("/mood-goal")
def get_mood_goal(
    db: Session = Depends(database.get_db),
    db_user: models.User = Depends(get_current_db_user),
):
    """Return the user's current mood goal, or null if not set."""
    goal = (
        db.query(models.MoodGoal).filter(models.MoodGoal.user_id == db_user.id).first()
    )
    if not goal:
        return {"vibe": None, "vibes": []}
    vibes = parse_goal_vibes(goal.vibe)
    return {
        "vibe": vibes[0] if vibes else None,
        "vibes": vibes,
        "updated_at": goal.updated_at.isoformat() if goal.updated_at else None,
    }


@app.put("/mood-goal")
def update_mood_goal(
    body: dict = Body(...),
    db: Session = Depends(database.get_db),
    db_user: models.User = Depends(get_current_db_user),
):
    """Create or update the user's mood goal."""
    raw_vibes = body.get("vibes")
    if raw_vibes is None:
        raw_vibes = [body.get("vibe")]
    if not isinstance(raw_vibes, list):
        raise HTTPException(status_code=400, detail="vibes must be a list")

    vibes = []
    for raw_vibe in raw_vibes:
        vibe = str(raw_vibe or "").strip().lower()
        if vibe and vibe not in vibes:
            vibes.append(vibe)

    if not vibes:
        raise HTTPException(status_code=400, detail="choose at least one vibe")
    if len(vibes) > 3:
        raise HTTPException(status_code=400, detail="choose up to 3 vibes")
    for vibe in vibes:
        if vibe not in VIBE_LABELS:
            raise HTTPException(status_code=400, detail=f"Unknown vibe: {vibe}")

    stored_vibes = json.dumps(vibes)

    goal = (
        db.query(models.MoodGoal).filter(models.MoodGoal.user_id == db_user.id).first()
    )
    if goal:
        goal.vibe = stored_vibes
        goal.updated_at = datetime.now(timezone.utc)
    else:
        goal = models.MoodGoal(user_id=db_user.id, vibe=stored_vibes)
        db.add(goal)
    db.commit()
    db.refresh(goal)
    return {
        "vibe": vibes[0],
        "vibes": vibes,
        "updated_at": goal.updated_at.isoformat(),
    }


@app.post("/journal-prompts")
async def get_journal_prompts(
    request: schemas.JournalPromptsRequest,
    current_user: str = Depends(auth.get_current_user),
):
    vibe = request.vibe.strip().lower()

    # Try Gemini first
    if gemini_model and request.description:
        try:
            prompt = f"""You are a compassionate journaling coach. A person just analyzed their mood and their current emotional vibe is "{vibe}".
 
Here is the scene description from their mood analysis:
"{request.description[:400]}"
 
Generate exactly 3 short, thoughtful reflection questions tailored to this specific vibe and scene.
Rules:
- Each question should be 1 sentence, personal, gently probing, and non-clinical
- Do NOT use the word "vibe"
- Write questions that feel like a wise, warm friend asking — not a therapist
- Return ONLY a JSON array of 3 strings, no other text, no markdown
 
Example format: ["Question one?", "Question two?", "Question three?"]"""

            response = await asyncio.to_thread(gemini_model.generate_content, prompt)
            raw = response.text.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            prompts = json.loads(raw.strip())
            if isinstance(prompts, list) and len(prompts) >= 2:
                return {"prompts": prompts[:3], "source": "ai"}
        except Exception as e:
            print(f"[Journal Prompts Gemini Error] {e}")

    # Static fallback
    prompts = STATIC_JOURNAL_PROMPTS.get(vibe, DEFAULT_JOURNAL_PROMPTS)
    return {"prompts": prompts, "source": "static"}


STORY_JOURNAL_PROMPT_TEMPLATE = """You are an expert cinematic storyteller and novelist, continuing a personal storybook built from someone's real mood journal entries.

Here are excerpts from their recent cinematic narrative entries, in chronological order:
{entries_block}

{user_request_block}

Write the next chapter of their story (2-3 paragraphs).

Rules:
- Write in present or near-present tense, second person ("you") or as a close third-person narrator following them, matching the tone of the excerpts above.
- Treat the excerpts as real chapters in an ongoing personal story — weave in a sense of continuity and emotional arc across them.
- Be evocative, literary, and cinematic, like a novelist writing a pivotal chapter.
- Do not summarize or list the entries; write a flowing narrative scene.
- Never say "based on the entries" or "the journal shows" — just tell the story.
- Return ONLY the story text, no titles, no preamble, no markdown."""

DEFAULT_STORY_JOURNAL_FALLBACK = (
    "The story pauses here for a quiet moment \u2014 not every chapter needs to be written "
    "right away. Log a few more moods, or add your own prompt above, and the next page "
    "will find its voice."
)


@app.post("/story-journal")
async def generate_story_journal(
    request: schemas.StoryJournalRequest,
    current_user: str = Depends(auth.get_current_user),
):
    """
    Generates the next chapter of the user's personal 'Story Journal' by weaving
    together their existing cinematic narrative entries (and an optional prompt
    from the user) into a new piece of continuous, copyable cinematic narrative.
    """
    entries = [e for e in (request.entries or []) if e.description and e.description.strip()]

    if not entries:
        return {
            "story": DEFAULT_STORY_JOURNAL_FALLBACK,
            "source": "static",
        }

    # Keep the prompt a reasonable size: most recent entries, trimmed.
    recent_entries = entries[-8:]
    entries_block = "\n\n".join(
        f"[{e.vibe or 'unknown mood'}] {e.description[:500]}" for e in recent_entries
    )

    user_request_block = (
        f'The user specifically asked for this chapter to explore: "{request.user_prompt.strip()}"'
        if request.user_prompt and request.user_prompt.strip()
        else "The user did not give a specific direction, so continue the story naturally from where the last entry leaves off."
    )

    if gemini_model:
        try:
            prompt = STORY_JOURNAL_PROMPT_TEMPLATE.format(
                entries_block=entries_block,
                user_request_block=user_request_block,
            )
            response = await asyncio.to_thread(gemini_model.generate_content, prompt)
            story = response.text.strip()
            if story:
                return {"story": story, "source": "ai"}
        except Exception as e:
            print(f"[Story Journal Gemini Error] {e}")

    # Static fallback: stitch the most recent entry into a gentle continuation note.
    last = recent_entries[-1]
    fallback = (
        f"{last.description.strip()}\n\nThe story continues here, even when the words "
        "haven't caught up yet. Come back to add the next page when you're ready."
    )
    return {"story": fallback, "source": "static"}


@app.post("/affirmation")
async def get_affirmation(
    request: schemas.AffirmationRequest,
    current_user: str = Depends(auth.get_current_user),
):
    vibe = request.vibe.strip().lower()

    # Try Gemini
    if gemini_model:
        try:
            hour = datetime.now().hour
            if 5 <= hour < 12:
                time_context = "morning"
            elif 12 <= hour < 17:
                time_context = "afternoon"
            elif 17 <= hour < 21:
                time_context = "evening"
            else:
                time_context = "late night"

            prompt = f"""Write a personal affirmation for someone whose current emotional vibe is "{vibe}" during the {time_context}.
  
Rules:
- Exactly 2 sentences
- Warm, poetic, and grounding — not generic or clinical
- Speak directly to the person using "you" or "your"
- Acknowledge the vibe without dramatizing it
- End on a note of quiet strength or self-compassion
- Return ONLY the affirmation text, nothing else"""

            response = await asyncio.to_thread(gemini_model.generate_content, prompt)
            affirmation = response.text.strip().strip('"')
            if affirmation:
                return {"affirmation": affirmation, "source": "ai"}
        except Exception as e:
            print(f"[Affirmation Gemini Error] {e}")

    # Static fallback
    affirmation = STATIC_AFFIRMATIONS.get(vibe, DEFAULT_AFFIRMATION)
    return {"affirmation": affirmation, "source": "static"}


@app.post("/companion-question")
async def get_companion_question(
    request: schemas.CompanionQuestionRequest,
    current_user: str = Depends(auth.get_current_user),
):
    """
    Returns a contextual check-in question tailored to the user's mood history.
    Tries Gemini first; falls back to static questions.
    """
    # ── Try Gemini ──
    if gemini_model and request.recent_vibes:
        try:
            context_parts = []
            if request.days_away >= 1:
                context_parts.append(
                    f"They have been away for {request.days_away} day(s)."
                )
            if request.trend != "neutral":
                context_parts.append(f"Their mood trend is {request.trend}.")
            if request.recent_vibes:
                context_parts.append(
                    f"Their recent vibes (most recent first): {request.recent_vibes}."
                )
            context_parts.append(
                f"It is currently {request.time_slot.replace('earlyMorning', 'early morning')}."
            )
            context_parts.append(
                f"They have logged {request.total_logs} total entries."
            )

            prompt = f"""You are a compassionate mood journal companion. Based on this context about a user:

{chr(10).join(context_parts)}

Write exactly ONE thoughtful, gentle check-in question for them. The question should:
- Feel personal and specific to their context (not generic)
- Be warm and non-clinical — like a close, wise friend asking
- Be a single sentence ending with a question mark
- Avoid the words "vibe", "mood", "trend", or "entry"
- NOT start with "How are you feeling?" (too common)

Return ONLY the question text, nothing else."""

            response = await asyncio.to_thread(gemini_model.generate_content, prompt)
            question = response.text.strip().strip('"')
            if question and question.endswith("?"):
                return {"question": question, "source": "ai"}
        except Exception as e:
            print(f"[Companion Question Gemini Error] {e}")

    # ── Static fallback ──
    question = pick_static_companion_question(request)
    return {"question": question, "source": "static"}


@app.get("/playlist-suggestions/{vibe}")
async def get_playlist_suggestions(
    vibe: str, current_user: str = Depends(auth.get_current_user)
):
    if not YOUTUBE_API_KEY:
        raise HTTPException(status_code=503, detail="YouTube API not configured")

    if vibe not in VIBE_YOUTUBE_QUERIES:
        raise HTTPException(status_code=400, detail="Unknown vibe label")

    queries = VIBE_YOUTUBE_QUERIES[vibe][:2]  # Use top 2 queries
    results = []

    for query in queries:
        url = "https://www.googleapis.com/youtube/v3/search"
        params = {
            "part": "snippet",
            "q": query,
            "type": "playlist",
            "maxResults": 2,
            "key": YOUTUBE_API_KEY,
        }
        resp = requests.get(url, params=params, timeout=10)
        if resp.status_code != 200:
            continue

        data = resp.json()
        for item in data.get("items", []):
            playlist_id = item["id"].get("playlistId")
            if not playlist_id:
                continue
            snippet = item["snippet"]
            results.append(
                {
                    "id": playlist_id,
                    "title": snippet.get("title", ""),
                    "channel": snippet.get("channelTitle", ""),
                    "thumbnail": snippet["thumbnails"].get("medium", {}).get("url", ""),
                    "url": f"https://www.youtube.com/playlist?list={playlist_id}",
                }
            )

    return {"vibe": vibe, "playlists": results[:4]}  # Return max 4


# ─── Therapist Chat ───────────────────────────────────────────────
class ChatMessage(BaseModel):
    role: str  # "user" or "model"
    text: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    vibe_context: Optional[str] = None  # pass the current mood vibe for context


THERAPIST_SYSTEM_PROMPT = """You are a warm, empathetic AI therapist named Sage. 
You listen deeply, reflect emotions back, ask thoughtful follow-up questions, 
and gently offer perspective. You never diagnose. You never give medical advice. 
You speak in a calm, grounding, supportive tone. Keep responses concise (2-4 sentences) 
unless the user clearly needs more. Always validate feelings before offering insight.
If someone is in crisis, gently encourage professional help."""


@app.post("/chat")
async def therapist_chat(
    request: ChatRequest, current_user: str = Depends(auth.get_current_user)
):
    if not gemini_model:
        raise HTTPException(status_code=503, detail="AI model not configured")

    try:
        # Build Gemini chat history format
        history = []

        # Add vibe context as a system-like first message if provided
        system_note = THERAPIST_SYSTEM_PROMPT
        if request.vibe_context:
            system_note += f"\n\nContext: The user's current mood vibe is '{request.vibe_context}'. Keep this in mind when responding."

        # Gemini uses "user" and "model" roles
        for msg in request.messages[:-1]:  # all except last
            history.append({"role": msg.role, "parts": [msg.text]})

        # Start a chat session with history
        chat = gemini_model.start_chat(history=history)

        # The last message is the new user input
        last_message = request.messages[-1].text

        # Prepend system prompt to first message only
        if len(history) == 0:
            last_message = f"[System: {system_note}]\n\nUser: {last_message}"

        response = await asyncio.to_thread(chat.send_message, last_message)

        return {"reply": response.text.strip()}

    except Exception as e:
        print(f"[Chat error] {e}")
        raise HTTPException(status_code=500, detail="Chat failed")




# ─── Semantic Search ──────────────────────────────────────────────────────────

@app.post("/semantic-search")
async def semantic_search(
    request: schemas.SemanticSearchRequest,
    db: Session = Depends(database.get_db),
    db_user: models.User = Depends(get_current_db_user),
):
    """Natural-language search over mood history using sentence embeddings."""
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    logs = (
        db.query(models.MoodLog)
        .filter(models.MoodLog.user_id == db_user.id)
        .order_by(models.MoodLog.timestamp.desc())
        .limit(200)
        .all()
    )
    if not logs:
        return {"results": [], "query": request.query}

    model = get_vibe_model()
    query_vec = model.encode(request.query, convert_to_numpy=True)

    scored = []
    for log in logs:
        text_parts = [log.vibe or "", log.short_caption or "", log.reflection or "", log.description or ""]
        entry_text = " ".join(p for p in text_parts if p).strip()
        if not entry_text:
            continue
        if log.embedding:
            try:
                entry_vec = np.array(json.loads(log.embedding), dtype=np.float32)
            except Exception:
                entry_vec = model.encode(entry_text, convert_to_numpy=True)
                log.embedding = json.dumps(entry_vec.tolist())
        else:
            entry_vec = model.encode(entry_text, convert_to_numpy=True)
            log.embedding = json.dumps(entry_vec.tolist())

        norm_q = np.linalg.norm(query_vec)
        norm_e = np.linalg.norm(entry_vec)
        if norm_q == 0 or norm_e == 0:
            continue
        score = float(np.dot(query_vec, entry_vec) / (norm_q * norm_e))
        scored.append((score, log))

    db.commit()
    scored.sort(key=lambda x: x[0], reverse=True)
    top = scored[: request.top_k]

    return {
        "results": [
            {**serialize_mood_log(log), "similarity": round(score, 4)}
            for score, log in top
            if score > 0.25
        ],
        "query": request.query,
    }


# ─── Trigger & Coping Theme Extraction ───────────────────────────────────────

@app.get("/trigger-analysis")
async def trigger_analysis(
    days: int = Query(30, ge=7, le=365),
    db: Session = Depends(database.get_db),
    db_user: models.User = Depends(get_current_db_user),
):
    """NLP extraction of recurring emotional triggers and coping themes."""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    logs = (
        db.query(models.MoodLog)
        .filter(
            models.MoodLog.user_id == db_user.id,
            models.MoodLog.timestamp >= since,
            models.MoodLog.reflection.isnot(None),
        )
        .order_by(models.MoodLog.timestamp.desc())
        .all()
    )

    reflections = [log.reflection for log in logs if log.reflection and log.reflection.strip()]
    captions = [log.short_caption for log in logs if log.short_caption]

    if not reflections and not captions:
        return {"triggers": [], "coping_themes": [], "source": "no_data",
                "entry_count": len(logs), "days": days}

    if gemini_model and reflections:
        try:
            combined = "\n---\n".join(reflections[:20])
            prompt = f"""You are an expert emotional pattern analyst. Analyze these journal reflections from a single person over the past {days} days:

{combined[:3000]}

Identify:
1. TRIGGERS: Recurring situations, people, thoughts, or events that seem to cause negative emotions (max 6, be specific)
2. COPING_THEMES: Positive strategies, activities, or mindsets the person uses or mentions to feel better (max 6)

Return ONLY valid JSON:
{{"triggers": ["trigger1", "trigger2"], "coping_themes": ["theme1", "theme2"]}}"""

            response = await asyncio.to_thread(gemini_model.generate_content, prompt)
            raw = response.text.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            result = json.loads(raw.strip())
            return {
                "triggers": result.get("triggers", [])[:6],
                "coping_themes": result.get("coping_themes", [])[:6],
                "source": "ai",
                "entry_count": len(logs),
                "days": days,
            }
        except Exception as e:
            print(f"[Trigger Analysis Gemini Error] {e}")

    TRIGGER_KEYWORDS = ["stress", "work", "tired", "overwhelm", "anxious", "worry",
                        "alone", "conflict", "deadline", "sleep", "pain", "fear",
                        "pressure", "rejection", "failure", "money", "health"]
    COPING_KEYWORDS = ["walk", "music", "friend", "rest", "breathe", "journal",
                       "exercise", "meditat", "read", "cook", "outside", "nature",
                       "gratitude", "creative", "art", "yoga", "calm"]
    all_text = " ".join(reflections + captions).lower()
    return {
        "triggers": [kw for kw in TRIGGER_KEYWORDS if kw in all_text][:6],
        "coping_themes": [kw for kw in COPING_KEYWORDS if kw in all_text][:6],
        "source": "keyword_fallback",
        "entry_count": len(logs),
        "days": days,
    }


# ─── Mood Forecast ────────────────────────────────────────────────────────────

@app.get("/mood-forecast")
async def mood_forecast(
    db: Session = Depends(database.get_db),
    db_user: models.User = Depends(get_current_db_user),
):
    """Predicts likely mood for the rest of today based on trajectory and time-of-day patterns."""
    logs = (
        db.query(models.MoodLog)
        .filter(models.MoodLog.user_id == db_user.id)
        .order_by(models.MoodLog.timestamp.desc())
        .limit(30)
        .all()
    )

    if len(logs) < 3:
        return {
            "predicted_vibe": "unknown",
            "confidence": 0.0,
            "reasoning": "Not enough data yet. Log a few more moods to unlock forecasting.",
            "suggested_actions": ["Keep logging your moods daily"],
            "source": "insufficient_data",
        }

    current_hour = datetime.now().hour
    time_slot = ("morning" if current_hour < 12 else
                 "afternoon" if current_hour < 17 else
                 "evening" if current_hour < 21 else "night")

    recent_vibes = [log.vibe for log in logs[:7]]
    tod_counts: Counter = Counter()
    for log in logs:
        if log.timestamp is None:
            continue
        h = log.timestamp.hour
        slot = ("morning" if h < 12 else "afternoon" if h < 17 else
                "evening" if h < 21 else "night")
        if slot == time_slot:
            tod_counts[log.vibe] += 1

    tod_top = tod_counts.most_common(1)[0][0] if tod_counts else recent_vibes[0]

    if gemini_model:
        try:
            prompt = f"""You are an emotional intelligence forecasting engine. Based on this user's data:

- Recent mood sequence (newest first): {", ".join(recent_vibes)}
- Historical {time_slot} mood pattern: {dict(tod_counts.most_common(5))}
- Current time of day: {time_slot}
- Valid mood labels: {", ".join(VIBE_LABELS)}

Predict their most likely emotional state for the rest of today.

Return ONLY valid JSON:
{{"predicted_vibe": "<label>", "confidence": <0.0-1.0>, "reasoning": "<2 sentences>", "suggested_actions": ["<action1>", "<action2>", "<action3>"]}}"""
            response = await asyncio.to_thread(gemini_model.generate_content, prompt)
            raw = response.text.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            result = json.loads(raw.strip())
            predicted = result.get("predicted_vibe", "")
            if predicted not in VIBE_LABELS:
                predicted = tod_top
            return {
                "predicted_vibe": predicted,
                "confidence": float(result.get("confidence", 0.5)),
                "reasoning": result.get("reasoning", ""),
                "suggested_actions": result.get("suggested_actions", [])[:3],
                "source": "ai",
                "emoji": VIBE_META.get(predicted, {}).get("emoji", "🌈"),
                "color": VIBE_META.get(predicted, {}).get("color", "#6c5ce7"),
            }
        except Exception as e:
            print(f"[Mood Forecast Gemini Error] {e}")

    predicted = tod_top if tod_counts else Counter(recent_vibes).most_common(1)[0][0]
    total = sum(tod_counts.values()) or 1
    return {
        "predicted_vibe": predicted,
        "confidence": round(tod_counts.get(predicted, 1) / total, 2),
        "reasoning": f"Based on your past {time_slot} entries, {predicted} is your most common state at this time.",
        "suggested_actions": ["Log your current mood", "Take a short mindful break"],
        "source": "statistical",
        "emoji": VIBE_META.get(predicted, {}).get("emoji", "🌈"),
        "color": VIBE_META.get(predicted, {}).get("color", "#6c5ce7"),
    }


# ─── Weekly Mood Summary ──────────────────────────────────────────────────────

@app.get("/mood-summary/weekly")
async def weekly_mood_summary(
    db: Session = Depends(database.get_db),
    db_user: models.User = Depends(get_current_db_user),
):
    """AI-generated weekly mood summary with highlights, patterns, and next steps."""
    since = datetime.now(timezone.utc) - timedelta(days=7)
    logs = (
        db.query(models.MoodLog)
        .filter(
            models.MoodLog.user_id == db_user.id,
            models.MoodLog.timestamp >= since,
        )
        .order_by(models.MoodLog.timestamp.asc())
        .all()
    )

    if not logs:
        return {
            "summary": "No entries this week yet. Start logging to unlock your weekly summary.",
            "highlights": [], "patterns": [],
            "next_steps": ["Log your first mood of the week"],
            "dominant_vibe": None, "entry_count": 0, "source": "no_data",
        }

    vibe_counts = Counter(log.vibe for log in logs)
    dominant = vibe_counts.most_common(1)[0][0]
    vibes_str = ", ".join(log.vibe for log in logs)
    reflections = [log.reflection for log in logs if log.reflection and log.reflection.strip()]

    if gemini_model:
        try:
            reflection_block = ("\n".join(reflections[:8])[:1500]) if reflections else "No journal entries this week."
            prompt = f"""You are a compassionate emotional wellness coach. Here is a user's week in data:

- Mood sequence (oldest to newest): {vibes_str}
- Total entries: {len(logs)}
- Dominant mood: {dominant}
- Journal excerpts: {reflection_block}

Write a warm, personal weekly summary. Return ONLY valid JSON:
{{"summary": "<2-3 sentence narrative in second person>", "highlights": ["<highlight1>", "<highlight2>"], "patterns": ["<pattern1>", "<pattern2>"], "next_steps": ["<suggestion1>", "<suggestion2>"]}}"""
            response = await asyncio.to_thread(gemini_model.generate_content, prompt)
            raw = response.text.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            result = json.loads(raw.strip())
            return {
                "summary": result.get("summary", ""),
                "highlights": result.get("highlights", [])[:3],
                "patterns": result.get("patterns", [])[:3],
                "next_steps": result.get("next_steps", [])[:3],
                "dominant_vibe": dominant,
                "entry_count": len(logs),
                "emoji": VIBE_META.get(dominant, {}).get("emoji", "🌈"),
                "color": VIBE_META.get(dominant, {}).get("color", "#6c5ce7"),
                "source": "ai",
            }
        except Exception as e:
            print(f"[Weekly Summary Gemini Error] {e}")

    top3 = [v for v, _ in vibe_counts.most_common(3)]
    unique_days = len(set(log.timestamp.date() for log in logs if log.timestamp))
    return {
        "summary": f"This week you logged {len(logs)} entries. Your dominant state was {dominant}, with {top3} appearing most often.",
        "highlights": [f"Most frequent mood: {dominant} ({vibe_counts[dominant]}x)"],
        "patterns": [f"You logged moods on {unique_days} different days this week"],
        "next_steps": ["Keep up your daily check-ins", "Try journaling about your most frequent mood"],
        "dominant_vibe": dominant,
        "entry_count": len(logs),
        "emoji": VIBE_META.get(dominant, {}).get("emoji", "🌈"),
        "color": VIBE_META.get(dominant, {}).get("color", "#6c5ce7"),
        "source": "statistical",
    }


@app.get("/")
async def health_check():
    return {
        "status": "online",
        "message": "Scene Vibe Server is running",
        "gemini": "enabled" if gemini_model else "disabled (no API key)",
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)


# ─── Cognitive Reframe ────────────────────────────────────────────────────────

@app.post("/reframe")
async def reframe_thought(
    request: schemas.ReframeRequest,
    current_user: str = Depends(auth.get_current_user),
):
    """Gemini-powered cognitive reframe of a negative or distorted thought."""
    if not request.thought.strip():
        raise HTTPException(status_code=400, detail="Thought cannot be empty")

    if gemini_model:
        try:
            vibe_context = f" Their current mood vibe is '{request.vibe}'." if request.vibe else ""
            prompt = f"""You are a compassionate cognitive behavioral therapist. A person is experiencing this thought:

"{request.thought}"{vibe_context}

Provide a gentle cognitive reframe that:
1. Validates their feeling without dismissing it
2. Offers an alternative, more balanced perspective
3. Ends with a grounding question or affirmation

Rules:
- Write 2-3 sentences in second person ("you")
- Be warm, not clinical
- Don't use therapy jargon
- Return ONLY the reframe text, nothing else"""
            response = await asyncio.to_thread(gemini_model.generate_content, prompt)
            reframe = response.text.strip().strip('"')
            return {"reframe": reframe, "source": "ai"}
        except Exception as e:
            print(f"[Reframe Gemini Error] {e}")

    return {
        "reframe": "That thought is real, and it's okay to feel it. What if there's another way to see this situation — one that's kinder to yourself?",
        "source": "fallback",
    }


# ─── Crisis Phrase Detection ──────────────────────────────────────────────────

CRISIS_KEYWORDS = [
    "kill myself", "end it all", "no reason to live", "better off dead",
    "suicide", "self-harm", "hurt myself", "can't go on", "want to die",
    "no point living", "give up on life", "hopeless", "worthless", "i'm a burden",
]


@app.post("/crisis-check")
async def crisis_check(
    request: schemas.CrisisCheckRequest,
    current_user: str = Depends(auth.get_current_user),
):
    """Detects crisis-risk phrases and returns a supportive escalation response."""
    text_lower = request.text.lower()
    detected = any(phrase in text_lower for phrase in CRISIS_KEYWORDS)

    if detected:
        return {
            "is_crisis": True,
            "message": "I hear that you're in a lot of pain right now. You don't have to face this alone — please reach out to a crisis counselor who can support you.",
            "resources": [
                {"name": "988 Suicide & Crisis Lifeline (US)", "contact": "Call or text 988"},
                {"name": "Crisis Text Line (US)", "contact": "Text HOME to 741741"},
                {"name": "International Association for Suicide Prevention", "contact": "https://www.iasp.info/resources/Crisis_Centres/"},
            ],
            "source": "keyword_detection",
        }

    return {"is_crisis": False, "message": None, "resources": [], "source": "safe"}


# ─── Habit Recommendations ────────────────────────────────────────────────────

@app.post("/habit-recommendations")
async def habit_recommendations(
    request: schemas.HabitRecommendationsRequest,
    current_user: str = Depends(auth.get_current_user),
):
    """Gemini maps mood patterns to small, trackable habit suggestions."""
    if not request.recent_vibes:
        return {"habits": [], "source": "no_data"}

    vibes_str = ", ".join(request.recent_vibes[:10])
    goal_context = f" Their mood goal is '{request.mood_goal}'." if request.mood_goal else ""

    if gemini_model:
        try:
            prompt = f"""You are a habit formation coach. Based on this person's recent mood pattern:

Recent vibes (newest first): {vibes_str}{goal_context}

Suggest exactly 3 small, trackable daily habits that could help them feel better or reach their goal.
Rules:
- Each habit should be 1 sentence, specific, and actionable
- Focus on evidence-based wellness (movement, sleep, connection, mindfulness, creativity)
- Make them realistic and non-overwhelming
- Return ONLY a JSON array of 3 strings, no other text"""
            response = await asyncio.to_thread(gemini_model.generate_content, prompt)
            raw = response.text.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            habits = json.loads(raw.strip())
            if isinstance(habits, list) and len(habits) >= 2:
                return {"habits": habits[:3], "source": "ai"}
        except Exception as e:
            print(f"[Habit Recommendations Gemini Error] {e}")

    return {
        "habits": [
            "Take 3 deep breaths when you feel overwhelmed",
            "Write down one thing you're grateful for each morning",
            "Step outside for 5 minutes of fresh air daily",
        ],
        "source": "static",
    }


# ─── Mood Streak ──────────────────────────────────────────────────────────────

@app.get("/mood-streak")
async def mood_streak(
    db: Session = Depends(database.get_db),
    db_user: models.User = Depends(get_current_db_user),
):
    """Calculate current streak, longest streak, and total days logged."""
    logs = (
        db.query(models.MoodLog)
        .filter(models.MoodLog.user_id == db_user.id)
        .order_by(models.MoodLog.timestamp.desc())
        .all()
    )

    if not logs:
        return {"current_streak": 0, "longest_streak": 0, "total_days": 0, "last_log_date": None}

    unique_dates = sorted(
        set(log.timestamp.date() for log in logs if log.timestamp),
        reverse=True,
    )

    if not unique_dates:
        return {"current_streak": 0, "longest_streak": 0, "total_days": 0, "last_log_date": None}

    today = datetime.now(timezone.utc).date()
    current_streak = 0
    for i, date in enumerate(unique_dates):
        if date == today - timedelta(days=i):
            current_streak += 1
        else:
            break

    longest_streak = 1
    temp = 1
    for i in range(1, len(unique_dates)):
        if unique_dates[i] == unique_dates[i - 1] - timedelta(days=1):
            temp += 1
            longest_streak = max(longest_streak, temp)
        else:
            temp = 1

    return {
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "total_days": len(unique_dates),
        "last_log_date": unique_dates[0].isoformat(),
    }
