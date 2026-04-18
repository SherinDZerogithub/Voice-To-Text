from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer, util
import uvicorn
import torch
from PIL import Image
import io
import os
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = FastAPI(title="Emotion Mood Analytics Server")

# Add CORS middleware to allow requests from mobile app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permits all origins
    allow_credentials=True,
    allow_methods=["*"],  # Permits all methods
    allow_headers=["*"],  # Permits all headers
)

# Load the Sentence Transformer model
print("Loading Sentence Embedding model...")
vibe_model = SentenceTransformer('all-MiniLM-L6-v2')

print("Loading CLIP model for image analysis...")
vision_model = SentenceTransformer('clip-ViT-B-32')

# Configure Gemini
GEMINI_API_KEY = os.environ.get("GOOGLE_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    gemini_model = genai.GenerativeModel('gemini-1.5-flash')
    print("Gemini model initialized.")
else:
    print("WARNING: GOOGLE_API_KEY not found. Gemini features will be disabled.")
    gemini_model = None

# Define our new emotion labels
# Define our new expanded emotion and vibe labels (20 total)
VIBE_LABELS = [
    # Zen Family
    "calm", "peaceful", "serene", "minimalist",
    # Radiant Family
    "happy", "energetic", "playful", "vibrant",
    # Melancholy Family
    "sad", "lonely", "pensive", "gloomy",
    # Edge Family
    "anxious", "chaotic", "intense", "gritty",
    # Soul Family
    "nostalgic", "romantic", "mystical", "vintage"
]

print("Pre-computing label embeddings...")
LABEL_EMBEDDINGS = vibe_model.encode(VIBE_LABELS, convert_to_tensor=True)
VISION_LABEL_EMBEDDINGS = vision_model.encode(VIBE_LABELS, convert_to_tensor=True)

print("Model loaded successfully!")

class MoodRequest(BaseModel):
    text: str

@app.post("/analyze-mood")
async def analyze_mood(request: MoodRequest):
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    try:
        # Generate embedding for the input text
        text_embedding = vibe_model.encode(request.text, convert_to_tensor=True)
        
        # Calculate cosine similarity between text and all labels
        cosine_scores = util.cos_sim(text_embedding, LABEL_EMBEDDINGS)[0]
        
        # Sort labels by similarity score
        sorted_indices = torch.argsort(cosine_scores, descending=True)
        labels = [VIBE_LABELS[idx] for idx in sorted_indices]
        scores = [cosine_scores[idx].item() for idx in sorted_indices]
        
        # Mapping to aesthetic metadata
        vibe_meta = {
            # Zen Family
            "calm": {"color": "#A8E6CF", "emoji": "😌", "feedback": "Take a deep breath. You are centered."},
            "peaceful": {"color": "#B2E2F2", "emoji": "🕊️", "feedback": "Harmony surrounds you right now."},
            "serene": {"color": "#D4F1F4", "emoji": "🧘", "feedback": "Find strength in this quiet moment."},
            "minimalist": {"color": "#F5F5F5", "emoji": "⚪", "feedback": "Simplicity is the ultimate sophistication."},
            
            # Radiant Family
            "happy": {"color": "#FFDE7D", "emoji": "😊", "feedback": "Your light is shining bright today!"},
            "energetic": {"color": "#FFD93D", "emoji": "⚡", "feedback": "Channel this power into something great."},
            "playful": {"color": "#FF8B94", "emoji": "🎈", "feedback": "Don't forget to keep that inner spark."},
            "vibrant": {"color": "#6BCB77", "emoji": "🌈", "feedback": "The world is a canvas of possibilities."},
            
            # Melancholy Family
            "sad": {"color": "#A2D2FF", "emoji": "😢", "feedback": "It's okay to let the rain fall sometimes."},
            "lonely": {"color": "#6C757D", "emoji": "👤", "feedback": "I'm here with you in this space."},
            "pensive": {"color": "#4A4E69", "emoji": "🤔", "feedback": "Depth of thought leads to growth."},
            "gloomy": {"color": "#9A8C98", "emoji": "☁️", "feedback": "Even clouds eventually move on."},
            
            # Edge Family
            "anxious": {"color": "#D4A5A5", "emoji": "😰", "feedback": "Ground yourself. Focus on one thing."},
            "chaotic": {"color": "#E94560", "emoji": "🌀", "feedback": "Find the still point in the storm."},
            "intense": {"color": "#FF4D4D", "emoji": "🔥", "feedback": "This intensity shows how much you care."},
            "gritty": {"color": "#2B2B2B", "emoji": "⛓️", "feedback": "Strength is often forged in the rough."},
            
            # Soul Family
            "nostalgic": {"color": "#FFAAA5", "emoji": "📺", "feedback": "A beautiful echo of where you've been."},
            "romantic": {"color": "#FFB7B2", "emoji": "❤️", "feedback": "Love is the thread that binds us."},
            "mystical": {"color": "#9D4EDD", "emoji": "✨", "feedback": "There is magic in the unknown."},
            "vintage": {"color": "#B08968", "emoji": "🎞️", "feedback": "Timeless vibes for a timeless soul."}
        }
        
        dominant_label = labels[0]
        dominant_score = scores[0]
        dominant_meta = vibe_meta.get(dominant_label, {"color": "#808080", "emoji": "🌈", "feedback": "Unique vibe!"})
        
        # Enhance all scores with metadata
        enriched_scores = []
        for label, score in zip(labels, scores):
            m = vibe_meta.get(label, {"color": "#808080", "emoji": "🌈"})
            enriched_scores.append({
                "label": label,
                "score": score,
                "percentage": f"{round(score * 100, 1)}%",
                "color": m["color"],
                "emoji": m["emoji"]
            })

        return {
            "mood": dominant_label, # Keeping 'mood' key for frontend compatibility
            "confidence": f"{round(dominant_score * 100, 2)}%",
            "emoji": dominant_meta["emoji"],
            "color": dominant_meta["color"],
            "feedback": dominant_meta.get("feedback"),
            "all_scores": enriched_scores
        }
    except Exception as e:
        print(f"Error during analysis: {e}")
        raise HTTPException(status_code=500, detail="Error analyzing mood")

@app.post("/analyze-image")
async def analyze_image(file: UploadFile = File(...)):
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File provided is not an image")
    
    try:
        # Read and open image
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        
        description = ""
        vibe = "unknown"
        
        if gemini_model:
            try:
                # Use Gemini for detailed description
                prompt = "Describe this image in a short, evocative sentence (maximum 20 words). Focus on the atmosphere and key elements."
                response = gemini_model.generate_content([prompt, image])
                description = response.text.strip()
                
                # Still calculate a vibe label for UI consistency
                # We can use the description we just generated to find the best vibe label
                desc_embedding = vibe_model.encode(description, convert_to_tensor=True)
                cos_scores = util.cos_sim(desc_embedding, LABEL_EMBEDDINGS)[0]
                best_idx = torch.argmax(cos_scores).item()
                vibe = VIBE_LABELS[best_idx]
            except Exception as ge:
                print(f"Gemini API error: {ge}")
                # Fallback to CLIP if Gemini fails
                image_embedding = vision_model.encode(image, convert_to_tensor=True)
                cos_scores = util.cos_sim(image_embedding, VISION_LABEL_EMBEDDINGS)[0]
                best_idx = torch.argmax(cos_scores).item()
                vibe = VIBE_LABELS[best_idx]
                description = f"The image captures a very {vibe} environment."
        else:
            # Fallback to CLIP if no API key
            image_embedding = vision_model.encode(image, convert_to_tensor=True)
            cos_scores = util.cos_sim(image_embedding, VISION_LABEL_EMBEDDINGS)[0]
            best_idx = torch.argmax(cos_scores).item()
            vibe = VIBE_LABELS[best_idx]
            description = f"The image captures a very {vibe} environment."
        
        return {
            "vibe": vibe,
            "description": description
        }
    except Exception as e:
        print(f"Image analysis error: {e}")
        raise HTTPException(status_code=500, detail="Error processing image")

@app.get("/")
async def health_check():
    return {"status": "online", "message": "Scene Vibe Server is running"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
