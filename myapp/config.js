/**
 * Application Configuration
 * Centralized configuration for API endpoints and app settings.
 */

import {Platform} from 'react-native';

// For Android emulator, 10.0.2.2 maps to the host machine's localhost.
const BACKEND_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:8000'
    : 'http://localhost:8000';

export const API_ENDPOINTS = {
  SIGNUP: `${BACKEND_URL}/signup`,
  LOGIN: `${BACKEND_URL}/login`,

  ANALYZE_MOOD: `${BACKEND_URL}/analyze-mood`,
  ANALYZE_AUDIO_PROSODY: `${BACKEND_URL}/analyze-audio-prosody`,

  MOOD_GOAL: `${BACKEND_URL}/mood-goal`,
  MOOD_HISTORY: `${BACKEND_URL}/mood-history`,
  MOOD_LOG: `${BACKEND_URL}/mood-log`,
  MOOD_STREAK: `${BACKEND_URL}/mood-streak`,

  ANALYTICS: `${BACKEND_URL}/analytics`,
  WEEKLY_SUMMARY: `${BACKEND_URL}/mood-summary/weekly`,
  MOOD_FORECAST: `${BACKEND_URL}/mood-forecast`,

  JOURNAL_PROMPTS: `${BACKEND_URL}/journal-prompts`,
  AFFIRMATION: `${BACKEND_URL}/affirmation`,
  COMPANION_QUESTION: `${BACKEND_URL}/companion-question`,
  REFRAME: `${BACKEND_URL}/reframe`,
  CRISIS_CHECK: `${BACKEND_URL}/crisis-check`,
  HABIT_RECOMMENDATIONS: `${BACKEND_URL}/habit-recommendations`,

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
