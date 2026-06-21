# Running Voice To Text Mood Companion

This project has two parts:

- `backend/` - FastAPI API server, database models, uploads, auth, and AI integrations.
- `myapp/` - React Native mobile app.

## Prerequisites

- Python 3.10+.
- Node.js 18+ or 20+.
- Android Studio plus an Android emulator for `npm run android`.
- Azure CLI if you are deploying the backend to Azure App Service.

## Backend: Local Development

From the repository root:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Open `http://localhost:8000/docs` to confirm the API is running.

Important `.env` values:

- `ENVIRONMENT=development` locally.
- `SECRET_KEY` must be changed before deployment.
- `DATABASE_URL=sqlite:///./app.db` is fine locally. Use Azure Database for PostgreSQL or another managed database for production.
- `GEMINI_API_KEY` enables Gemini-backed AI features.
- `YOUTUBE_API_KEY` enables playlist suggestions.
- `UPLOADS_DIR` should point to persistent storage in production.

## Mobile App: Local Development

In a second terminal:

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

By default, the app uses:

- Android emulator: `http://10.0.2.2:8000`
- iOS simulator: `http://localhost:8000`

For a real phone or a release build, update the backend URL through `myapp/config.js` or provide `EXPO_PUBLIC_BACKEND_URL` during your build process if your React Native build pipeline injects environment variables.

## Azure Backend Deployment Notes

Deploy the contents of `backend/` as a Python Linux Azure App Service.

Set the App Service startup command to:

```bash
startup.sh
```

Or use the underlying command:

```bash
gunicorn -k uvicorn.workers.UvicornWorker -w 2 --timeout 600 -b 0.0.0.0:${PORT:-8000} main:app
```

Set these Azure App Service application settings:

```text
ENVIRONMENT=production
SECRET_KEY=<strong-random-secret>
DATABASE_URL=<production-database-url>
GEMINI_API_KEY=<optional>
GEMINI_MODEL=gemini-2.5-flash
YOUTUBE_API_KEY=<optional>
UPLOADS_DIR=<persistent-mounted-path-if-used>
CORS_ALLOWED_ORIGINS=*
```

For production, avoid the local SQLite file unless this is only a demo. Azure App Service local disk is not reliable for durable app data, and uploaded photos/audio should use a mounted Azure Storage share or Blob Storage.

## Verification Commands

Backend:

```powershell
cd backend
python -m compileall auth.py database.py main.py models.py new_endpoints.py schemas.py verify_auth.py check_db.py
python -c "import main; print(main.app.title)"
```

Mobile:

```powershell
cd myapp
npm test -- --runInBand
npm run lint
npx tsc --noEmit
```

## Troubleshooting

- If the mobile app cannot reach Azure, make sure `myapp/config.js` points to the deployed `https://<app-name>.azurewebsites.net` URL before building the app.
- If Azure starts but requests fail, check App Service logs for missing `SECRET_KEY`, missing Python packages, or database connection errors.
- If uploaded images disappear after redeploys or restarts, configure persistent storage and set `UPLOADS_DIR`.
- If AI features return fallback results, confirm `GEMINI_API_KEY` is set in Azure application settings.
