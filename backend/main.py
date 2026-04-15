from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import pipeline
import uvicorn

app = FastAPI(title="Mood Companion NLP Server")

# Add CORS middleware to allow requests from mobile app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permits all origins
    allow_credentials=True,
    allow_methods=["*"],  # Permits all methods
    allow_headers=["*"],  # Permits all headers
)

# Load the emotion detection pipeline
# This will download the model on the first run (approx 250MB)
print("Loading BERT Emotion model...")
emotion_classifier = pipeline(
    "text-classification", 
    model="bhadresh-savani/distilbert-base-uncased-emotion", 
    top_k=None  # Modern way to get all scores
)
print("Model loaded successfully!")

class MoodRequest(BaseModel):
    text: str

@app.post("/analyze-mood")
async def analyze_mood(request: MoodRequest):
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    try:
        # Perform classification
        results = emotion_classifier(request.text)
        
        # New transformers format returns a list of dictionaries directly if top_k is used
        # results is typically [[{'label': 'joy', 'score': 0.99}, ...]]
        # or sometimes [{'label': 'joy', 'score': 0.99}, ...]
        
        if isinstance(results[0], list):
            scores = results[0]
        else:
            scores = results

        dominant_emotion = max(scores, key=lambda x: x['score'])
        
        # Mapping to user-friendly moods and UI suggestions
        mood_meta = {
            "joy": {"color": "#FFD700", "emoji": "😊", "feedback": "You seem happy! Keep that energy up!"},
            "sadness": {"color": "#4682B4", "emoji": "😢", "feedback": "It's okay to feel down. I'm here for you."},
            "anger": {"color": "#FF4500", "emoji": "😠", "feedback": "Take a deep breath. Let's try to calm down."},
            "fear": {"color": "#9370DB", "emoji": "😨", "feedback": "It's natural to feel anxious. Stay grounded."},
            "love": {"color": "#FF69B4", "emoji": "❤️", "feedback": "Spread the love! Such a warm feeling."},
            "surprise": {"color": "#32CD32", "emoji": "😮", "feedback": "Wow! What a surprise!"}
        }
        
        label = dominant_emotion['label']
        meta = mood_meta.get(label, {"color": "#808080", "emoji": "🤔", "feedback": "Interesting..."})
        
        return {
            "mood": label,
            "confidence": f"{round(dominant_emotion['score'] * 100, 2)}%",
            "emoji": meta["emoji"],
            "color": meta["color"],
            "feedback": meta["feedback"],
            "all_scores": scores
        }
    except Exception as e:
        print(f"Error during analysis: {e}")
        raise HTTPException(status_code=500, detail="Error analyzing mood")

@app.get("/")
async def health_check():
    return {"status": "online", "message": "Mood Companion Server is running"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
