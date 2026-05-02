from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone

import asyncio
from fastapi import FastAPI, HTTPException, File, UploadFile, Body, Form, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
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
from typing import Optional
import google.generativeai as genai
from dotenv import load_dotenv
import requests

load_dotenv()

# ── Create uploads directory for storing user photos ──
UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "uploads")
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


app = FastAPI(title="Emotion Mood Analytics Server")

models.Base.metadata.create_all(bind=database.engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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


GEMINI_API_KEY = os.environ.get("GOOGLE_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    gemini_model = genai.GenerativeModel("gemini-3-flash-preview")
    print("Gemini model initialized.")
else:
    print("WARNING: GOOGLE_API_KEY not found. Gemini features will be disabled.")
    gemini_model = None

VIBE_LABELS = [
    "calm",
    "peaceful",
    "serene",
    "minimalist",
    "happy",
    "energetic",
    "playful",
    "vibrant",
    "sad",
    "lonely",
    "pensive",
    "gloomy",
    "anxious",
    "chaotic",
    "intense",
    "gritty",
    "nostalgic",
    "romantic",
    "mystical",
    "vintage",
    "cozy",
    "ethereal",
    "melancholic",
    "industrial",
    "natural",
    "futuristic",
    "bold",
    "solitary",
    "tense",
    "hopeful",
]

# Lazy-load models and pre-compute embeddings on first request
LABEL_EMBEDDINGS = None
VISION_LABEL_EMBEDDINGS = None


def get_label_embeddings():
    global LABEL_EMBEDDINGS, VISION_LABEL_EMBEDDINGS
    if LABEL_EMBEDDINGS is None:
        print("Pre-computing label embeddings...")
        LABEL_EMBEDDINGS = get_vibe_model().encode(VIBE_LABELS, convert_to_tensor=True)
        VISION_LABEL_EMBEDDINGS = get_vision_model().encode(
            VIBE_LABELS, convert_to_tensor=True
        )
        print("Model loaded successfully!")
    return LABEL_EMBEDDINGS, VISION_LABEL_EMBEDDINGS


VIBE_META = {
    "calm": {
        "color": "#A8E6CF",
        "emoji": "😌",
        "feedback": "Take a deep breath. You are centered.",
    },
    "peaceful": {
        "color": "#B2E2F2",
        "emoji": "🕊️",
        "feedback": "Harmony surrounds you right now.",
    },
    "serene": {
        "color": "#D4F1F4",
        "emoji": "🧘",
        "feedback": "Find strength in this quiet moment.",
    },
    "minimalist": {
        "color": "#F5F5F5",
        "emoji": "⚪",
        "feedback": "Simplicity is the ultimate sophistication.",
    },
    "happy": {
        "color": "#FFDE7D",
        "emoji": "😊",
        "feedback": "Your light is shining bright today!",
    },
    "energetic": {
        "color": "#FFD93D",
        "emoji": "⚡",
        "feedback": "Channel this power into something great.",
    },
    "playful": {
        "color": "#FF8B94",
        "emoji": "🎈",
        "feedback": "Don't forget to keep that inner spark.",
    },
    "vibrant": {
        "color": "#6BCB77",
        "emoji": "🌈",
        "feedback": "The world is a canvas of possibilities.",
    },
    "sad": {
        "color": "#A2D2FF",
        "emoji": "😢",
        "feedback": "It's okay to let the rain fall sometimes.",
    },
    "lonely": {
        "color": "#6C757D",
        "emoji": "👤",
        "feedback": "I'm here with you in this space.",
    },
    "pensive": {
        "color": "#4A4E69",
        "emoji": "🤔",
        "feedback": "Depth of thought leads to growth.",
    },
    "gloomy": {
        "color": "#9A8C98",
        "emoji": "☁️",
        "feedback": "Even clouds eventually move on.",
    },
    "anxious": {
        "color": "#D4A5A5",
        "emoji": "😰",
        "feedback": "Ground yourself. Focus on one thing.",
    },
    "chaotic": {
        "color": "#E94560",
        "emoji": "🌀",
        "feedback": "Find the still point in the storm.",
    },
    "intense": {
        "color": "#FF4D4D",
        "emoji": "🔥",
        "feedback": "This intensity shows how much you care.",
    },
    "gritty": {
        "color": "#2B2B2B",
        "emoji": "⛓️",
        "feedback": "Strength is often forged in the rough.",
    },
    "nostalgic": {
        "color": "#FFAAA5",
        "emoji": "📺",
        "feedback": "A beautiful echo of where you've been.",
    },
    "romantic": {
        "color": "#FFB7B2",
        "emoji": "❤️",
        "feedback": "Love is the thread that binds us.",
    },
    "mystical": {
        "color": "#9D4EDD",
        "emoji": "✨",
        "feedback": "There is magic in the unknown.",
    },
    "vintage": {
        "color": "#B08968",
        "emoji": "🎞️",
        "feedback": "Timeless vibes for a timeless soul.",
    },
    "cozy": {
        "color": "#E6A15C",
        "emoji": "🕯️",
        "feedback": "Warmth and comfort wrap around you.",
    },
    "ethereal": {
        "color": "#B8C0FF",
        "emoji": "🌫️",
        "feedback": "A dreamlike state where reality blurs.",
    },
    "melancholic": {
        "color": "#4E6E81",
        "emoji": "🥀",
        "feedback": "There is a beautiful weight in this sadness.",
    },
    "industrial": {
        "color": "#545B64",
        "emoji": "⚙️",
        "feedback": "Raw, structural energy and cold metal.",
    },
    "natural": {
        "color": "#4A7C59",
        "emoji": "🌲",
        "feedback": "Connected to the rhythm of the earth.",
    },
    "futuristic": {
        "color": "#00F5D4",
        "emoji": "🤖",
        "feedback": "A glimpse into what lies ahead.",
    },
    "bold": {
        "color": "#F15BB5",
        "emoji": "🏎️",
        "feedback": "Fearless, high-contrast presence.",
    },
    "solitary": {
        "color": "#8D99AE",
        "emoji": "🏔️",
        "feedback": "Finding peace in your own company.",
    },
    "tense": {
        "color": "#D90429",
        "emoji": "⚠️",
        "feedback": "The air is thick with anticipation.",
    },
    "hopeful": {
        "color": "#FEE440",
        "emoji": "🌅",
        "feedback": "A new dawn is just beginning.",
    },
}


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
        "emoji": dominant_meta["emoji"],
        "color": dominant_meta["color"],
        "feedback": dominant_meta["feedback"],
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

    new_log = models.MoodLog(
        user_id=db_user.id,
        vibe=vibe,
        emoji=mood_log.emoji,
        timestamp=mood_log.timestamp or datetime.now(timezone.utc),
        short_caption=short_caption,
        color=color,
        scene_tags=json.dumps(scene_tags),
        image_path=mood_log.image_path,
        description=mood_log.description,
        feedback=mood_log.feedback,
        poetic_summary=mood_log.poetic_summary,
        confidence=mood_log.confidence,
        gemini_confidence=mood_log.gemini_confidence,
        environment_type=mood_log.environment_type,
        color_palette=json.dumps(mood_log.color_palette),
        secondary_moods=json.dumps(mood_log.secondary_moods),
        all_scores=json.dumps(mood_log.all_scores),
    )
    db.add(new_log)
    db.commit()
    db.refresh(new_log)

    return serialize_mood_log(new_log)


@app.get("/mood-history", response_model=schemas.MoodHistoryResponse)
def get_mood_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(database.get_db),
    db_user: models.User = Depends(get_current_db_user),
):
    query = db.query(models.MoodLog).filter(models.MoodLog.user_id == db_user.id)
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

    for entry in entries:
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
        "most_common": mood_counts.most_common(1)[0][0] if mood_counts else None,
        "daily_breakdown": daily_breakdown,
    }


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


@app.get("/")
async def health_check():
    return {
        "status": "online",
        "message": "Scene Vibe Server is running",
        "gemini": "enabled" if gemini_model else "disabled (no API key)",
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
