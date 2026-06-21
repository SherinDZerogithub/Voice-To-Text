# Voice To Text Mood Companion

React Native + FastAPI app for voice/text mood logging, image-based vibe analysis, journaling, analytics, avatar personalization, playlists, and a supportive chat companion.

## Project Structure

- `myapp/` - React Native mobile app
- `backend/` - FastAPI backend, SQLite database, auth, AI/NLP analysis, image/audio uploads
- `backend/uploads/` - user-uploaded photos and audio served by the API
- `backend/app.db` - local SQLite database

## Backend Setup

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Required for full AI features:

- `GEMINI_API_KEY` enables Gemini mood analysis, journaling, affirmations, companion questions, and chat. `GOOGLE_API_KEY` is still accepted as a fallback.
- `GEMINI_MODEL` defaults to `gemini-2.5-flash`.
- `YOUTUBE_API_KEY` enables playlist suggestions.
- `SECRET_KEY` should be changed before sharing or deployment.

Without API keys, the backend still starts, and local transformer fallbacks handle core mood/image analysis where possible.

## Mobile Setup

```powershell
cd myapp
npm install
npm start
```

In another terminal:

```powershell
cd myapp
npm run android
```

The app uses `http://10.0.2.2:8000` for Android emulator backend access and `http://localhost:8000` for iOS/simulator.

## Main Features

- Email/password signup and login with JWT auth
- Voice-to-text mood check-ins
- Text mood analysis with semantic vibe scores
- Image mood analysis with Gemini or local BLIP/CLIP fallback
- Mood history, deletion, search-ready pagination, and analytics
- Avatar builder and mood goal tracking
- Journal prompts, affirmations, mood companion questions, and AI chat
- Photo uploads linked to mood logs
- Raw WAV audio prosody analysis for pace, pauses, volume, and estimated emotional tone
- YouTube playlist suggestions by vibe

## Useful Checks

```powershell
cd backend
python -m compileall auth.py database.py main.py models.py new_endpoints.py schemas.py verify_auth.py check_db.py
.\venv\Scripts\python.exe -c "import main; print(main.app.title)"
cd ..\myapp
npm test
npm run lint
```

## Advanced Backend/NLP Ideas

- Mood trajectory prediction from recent entries, time of day, and streak patterns
- Semantic search over past reflections using sentence embeddings
- Personalized trigger and coping-theme extraction from journal text
- Crisis-risk phrase detection with a careful support/escalation response
- Weekly AI-generated mood summaries with highlights, recurring patterns, and gentle next steps
- Retrieval-augmented chat that references the user's own mood history with privacy controls
- Habit recommendation engine that maps mood patterns to small, trackable actions
