/**
 * Application Configuration
 * Centralized configuration for API endpoints and app settings.
 *
 * BACKEND_URL resolution order:
 *   1. EXPO_PUBLIC_BACKEND_URL env var (set in .env or via EAS build secrets)
 *      e.g. EXPO_PUBLIC_BACKEND_URL=https://your-app.azurewebsites.net
 *   2. Local emulator/simulator defaults for development only.
 *
 * IMPORTANT FOR PRODUCTION / AZURE DEPLOYMENT:
 * Once your backend is deployed (e.g. to Azure App Service), set
 * EXPO_PUBLIC_BACKEND_URL to that HTTPS URL in your .env file (see
 * .env.example) before building a release APK/AAB. Never ship a release
 * build pointed at localhost or an emulator-only address.
 */

import {Platform} from 'react-native';

const ENV_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// For Android emulator, 10.0.2.2 maps to the host machine's localhost.
// These are ONLY used when no env var is set, i.e. local development.
const DEV_BACKEND_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';

const BACKEND_URL = ENV_BACKEND_URL || DEV_BACKEND_URL;

if (!ENV_BACKEND_URL && !__DEV__) {
  console.warn(
    '[config] EXPO_PUBLIC_BACKEND_URL is not set. Falling back to a ' +
      'local development URL, which will NOT work in a production build. ' +
      'Set EXPO_PUBLIC_BACKEND_URL to your deployed backend URL.',
  );
}

export const API_ENDPOINTS = {
  SIGNUP: `${BACKEND_URL}/signup`,
  LOGIN: `${BACKEND_URL}/login`,

  ANALYZE_MOOD: `${BACKEND_URL}/analyze-mood`,
  ANALYZE_AUDIO_PROSODY: `${BACKEND_URL}/analyze-audio-prosody`,

  MOOD_GOAL: `${BACKEND_URL}/mood-goal`,
  MOOD_HISTORY: `${BACKEND_URL}/mood-history`,
  MOOD_LOG: `${BACKEND_URL}/mood-log`,
  MOOD_STREAK: `${BACKEND_URL}/mood-streak`,

  ANALYTICS: `${BACKEND_URL}/analytics/me`,
  WEEKLY_SUMMARY: `${BACKEND_URL}/mood-summary/weekly`,
  MOOD_FORECAST: `${BACKEND_URL}/mood-forecast`,

  JOURNAL_PROMPTS: `${BACKEND_URL}/journal-prompts`,
  AFFIRMATION: `${BACKEND_URL}/affirmation`,
  COMPANION_QUESTION: `${BACKEND_URL}/companion-question`,
  REFRAME: `${BACKEND_URL}/reframe`,
  CRISIS_CHECK: `${BACKEND_URL}/crisis-check`,
  HABIT_RECOMMENDATIONS: `${BACKEND_URL}/habit-recommendations`,
  GOAL_INSIGHT: `${BACKEND_URL}/goal-insight`,

  IMAGE_ANALYSIS: `${BACKEND_URL}/analyze-image`,
  PLAYLIST_SUGGESTIONS: `${BACKEND_URL}/playlist-suggestions`,

  THERAPIST_CHAT: `${BACKEND_URL}/chat`,
  SEMANTIC_SEARCH: `${BACKEND_URL}/semantic-search`,
  TRIGGER_ANALYSIS: `${BACKEND_URL}/trigger-analysis`,
};

export const APP_CONFIG = {
  API_TIMEOUT: 30000,
  MOOD_HISTORY_PAGE_SIZE: 20,
  VOICE_ENABLED: true,
  ANALYTICS_ENABLED: true,
  DEBUG: false,
};

export default BACKEND_URL;
