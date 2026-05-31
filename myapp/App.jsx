import React, {useEffect, useState, useCallback, useRef, useMemo} from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  View,
  StyleSheet,
  PermissionsAndroid,
  Text,
  NativeModules,
  Animated,
  TouchableOpacity,
} from 'react-native';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';

// Import Custom Components
import VoiceInput from './components/VoiceInput';
import MoodResult from './components/MoodResult';
import ImageGallery from './components/ImageGallery';
import AuthScreen from './components/AuthScreen';
import AvatarBuilder from './components/AvatarBuilder';
import HistoryDisplay from './components/HistoryDisplay';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AnalyticsDisplay from './components/AnalyticsDisplay'; // Import the new component
import TherapistChat from './components/TherapistChat';
import VibeSuggestions from './components/VibeSuggestions';
import DashboardHero from './components/DashboardHero';
import MoodPatternWarning from './components/MoodPatternWarning';
import JournalPrompts from './components/JournalPrompts';
import AffirmationBanner from './components/AffirmationBanner';
import {SAMPLE_IMAGES} from './constants/sampleImages';
import {getContrastColor, DESIGN_TOKENS} from './utils/colors';
import StreakBadges from './components/StreakBadges';
import MoodCompanion from './components/MoodCompanion';
import WeeklySummaryCard from './components/WeeklySummaryCard';
import MoodForecastCard from './components/MoodForecastCard';
import HabitRecommendations from './components/HabitRecommendations';
import TriggerInsightsCard from './components/TriggerInsightsCard';
import MoodDice from './components/MoodDice';
import MoodJar from './components/MoodJar';
import MoodTwin from './components/MoodTwin';
import MoodGarden from './components/MoodGarden';
import GoalAlignmentRing from './components/GoalAlignmentRing';
import CelebrationCorner from './components/CelebrationCorner';

// RN 0.71+ expects native event modules to expose listener stubs.
// We stub common module names used by voice libraries to prevent NativeEventEmitter warnings.
['Voice', 'ReactNativeVoice', 'RCTVoice'].forEach(moduleName => {
  if (NativeModules[moduleName]) {
    if (!NativeModules[moduleName].addListener) {
      NativeModules[moduleName].addListener = () => {};
    }
    if (!NativeModules[moduleName].removeListeners) {
      NativeModules[moduleName].removeListeners = () => {};
    }
  }
});

import Voice from '@react-native-voice/voice';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [userName, setUserName] = useState('');
  const [isLoginFlow, setIsLoginFlow] = useState(true);
  const [avatarVisible, setAvatarVisible] = useState(false);
  const [moodHistory, setMoodHistory] = useState([]);
  const [avatarConfig, setAvatarConfig] = useState(null);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null); // Track selected history item
  const [isVoiceAvailable, setIsVoiceAvailable] = useState(true);
  const [images, setImages] = useState([]);
  const [isCapturingImage, setIsCapturingImage] = useState(false);
  const [moodData, setMoodData] = useState(null);
  const [isSelectingImage, setIsSelectingImage] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [text, setText] = useState('');
  const [appBgColor, setAppBgColor] = useState('#f5f5f5');
  const [moodGoal, setMoodGoal] = useState(null); // { vibe: string, vibes: string[] }
  const [analyticsData, setAnalyticsData] = useState(null); // New state for analytics
  const [crisisAlert, setCrisisAlert] = useState(null);
  const [chatInitialPrompt, setChatInitialPrompt] = useState('');
  const [gratitudeGems, setGratitudeGems] = useState([]);
  const moodGoalRequestId = useRef(0);

  const [activeTab, setActiveTab] = useState('home'); // 'home', 'chat', 'history', 'analytics'

  // Check if a mood has been logged today
  const hasLoggedToday = useMemo(() => {
    const today = new Date().toDateString();
    return moodHistory.some(item => {
      // Use rawTimestamp which we'll add to the formatted item
      const itemDate = item.rawTimestamp ? new Date(item.rawTimestamp) : null;
      return itemDate && itemDate.toDateString() === today;
    });
  }, [moodHistory]);

  const journeyAnalyticsData = useMemo(() => {
    const moodFrequency = analyticsData?.mood_frequency || {};
    const vibeBreakdown = Object.entries(moodFrequency)
      .map(([label, count]) => ({label, count}))
      .sort((a, b) => b.count - a.count);

    const entryDays = Array.from(
      new Set(
        moodHistory
          .map(item => {
            const date = item.rawTimestamp ? new Date(item.rawTimestamp) : null;
            return date && !Number.isNaN(date.getTime())
              ? date.toISOString().slice(0, 10)
              : null;
          })
          .filter(Boolean),
      ),
    ).sort((a, b) => (a < b ? 1 : -1));

    let consecutiveDays = 0;
    if (entryDays.length > 0) {
      const cursor = new Date(entryDays[0]);
      for (const day of entryDays) {
        const expected = cursor.toISOString().slice(0, 10);
        if (day !== expected) {
          break;
        }
        consecutiveDays += 1;
        cursor.setDate(cursor.getDate() - 1);
      }
    }

    const goalVibes = moodGoal?.vibes?.length
      ? moodGoal.vibes
      : moodGoal?.vibe
      ? [moodGoal.vibe]
      : [];
    const totalEntries = analyticsData?.total_entries || 0;
    const goalEntries = vibeBreakdown
      .filter(vibe => goalVibes.includes(vibe.label.toLowerCase()))
      .reduce((sum, vibe) => sum + vibe.count, 0);
    const goalTarget = Math.max(totalEntries * 0.5, 5);

    return {
      ...analyticsData,
      total_entries: totalEntries,
      vibe_breakdown: vibeBreakdown,
      consecutive_days: analyticsData?.consecutive_days || consecutiveDays,
      goal_completed:
        analyticsData?.goal_completed ||
        (goalTarget > 0 && goalEntries >= goalTarget),
      gratitude_count: analyticsData?.gratitude_count || gratitudeGems.length,
    };
  }, [analyticsData, gratitudeGems.length, moodGoal, moodHistory]);

  // Configuration for Backend
  // Note: 10.0.2.2 is the localhost for Android emulator.
  const BACKEND_URL =
    Platform.OS === 'android'
      ? 'http://10.0.2.2:8000'
      : 'http://localhost:8000';

  const handleOpenChat = useCallback((prompt = '') => {
    setChatInitialPrompt(prompt);
    setActiveTab('chat');
  }, []);

  const fetchMoodGoal = useCallback(
    async (authToken = token) => {
      if (!authToken) {
        return;
      }
      try {
        const response = await fetch(`${BACKEND_URL}/mood-goal`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setMoodGoal(data);
        }
      } catch (error) {
        console.warn('Mood goal fetch failed:', error);
      }
    },
    [BACKEND_URL, token],
  );

  const updateMoodGoal = useCallback(
    async vibes => {
      if (!token) {
        return;
      }
      const selectedVibes = (Array.isArray(vibes) ? vibes : [vibes])
        .map(vibe => vibe?.toString().trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 3);
      if (selectedVibes.length === 0) {
        return;
      }
      const requestId = moodGoalRequestId.current + 1;
      moodGoalRequestId.current = requestId;
      setMoodGoal(current => ({
        ...current,
        vibe: selectedVibes[0],
        vibes: selectedVibes,
      }));
      try {
        const response = await fetch(`${BACKEND_URL}/mood-goal`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({vibes: selectedVibes}),
        });
        if (response.ok) {
          const data = await response.json();
          if (moodGoalRequestId.current === requestId) {
            setMoodGoal(data);
          }
        }
      } catch (error) {
        console.error('Failed to update mood goal:', error);
      }
    },
    [BACKEND_URL, token],
  );

  const fetchAnalyticsData = useCallback(
    async (authToken = token) => {
      if (!authToken) {
        return;
      }
      try {
        const response = await fetch(`${BACKEND_URL}/analytics/me?days=30`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Failed to load analytics: ${response.status} ${errorText}`,
          );
        }

        const data = await response.json();
        console.log('Analytics data loaded:', data);
        setAnalyticsData(data);
      } catch (error) {
        console.warn('Analytics fetch failed:', error.message || error);
      }
    },
    [BACKEND_URL, token],
  );

  useEffect(() => {
    if (activeTab === 'analytics' && token) {
      fetchAnalyticsData(token);
      fetchMoodGoal(token);
    }
  }, [activeTab, token, fetchAnalyticsData, fetchMoodGoal]);

  // Animation value for the dashboard avatar entry
  const avatarAnim = useRef(new Animated.Value(0)).current;

  // Ref to access JournalPrompts answers
  const journalPromptsRef = useRef(null);
  const affirmationRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated) {
      avatarAnim.setValue(0);
      Animated.spring(avatarAnim, {
        toValue: 1,
        friction: 8,
        tension: 35,
        useNativeDriver: true,
      }).start();
    }
  }, [isAuthenticated, avatarAnim]);

  // Configuration for Backend
  // Note: 10.0.2.2 is the localhost for Android emulator.
  // Change to your machine's IP if testing on a real device.
  // (BACKEND_URL is defined at line 71)

  const formatMoodHistoryItem = useCallback((item, fallbackEmoji = '') => {
    const date = item.timestamp ? new Date(item.timestamp) : new Date();

    return {
      id: item.id?.toString() || Date.now().toString(),
      rawTimestamp: item.timestamp || date.toISOString(),
      timestamp: Number.isNaN(date.getTime())
        ? ''
        : date.toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
      vibe: item.vibe,
      mood: item.vibe, // Ensure mood field is present for MoodResult
      emoji: item.emoji || fallbackEmoji || '🌈',
      color: item.color || '#6c5ce7',
      caption: item.short_caption || item.caption || item.vibe || 'Mood entry',
      scene_tags: item.scene_tags || [],
      description: item.description || item.full_description || '',
      feedback: item.feedback || '',
      poetic_summary: item.poetic_summary || '',
      confidence: item.confidence || '',
      gemini_confidence: item.gemini_confidence || null,
      environment_type: item.environment_type || '',
      color_palette: item.color_palette || [],
      secondary_moods: item.secondary_moods || [],
      all_scores: item.all_scores || [],
      audio_path: item.audio_path || null,
      prosody_analysis: item.prosody_analysis || null,
      reflection: item.reflection || '',
      doodles: item.doodles || '',
      gentle_reminder: item.gentle_reminder || '',
    };
  }, []);

  const fetchMoodHistory = useCallback(
    async (authToken = token, page = 1, search = '') => {
      if (!authToken) {
        return;
      }

      try {
        const params = new URLSearchParams({
          page: String(page),
          page_size: '30',
        });
        if (search && search.trim()) {
          params.append('search', search.trim());
        }

        const response = await fetch(
          `${BACKEND_URL}/mood-history?${params.toString()}`,
          {headers: {Authorization: `Bearer ${authToken}`}},
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Failed to load mood history: ${response.status} ${errorText}`,
          );
        }

        const data = await response.json();
        setMoodHistory(
          (data.items || []).map(item => formatMoodHistoryItem(item)),
        );
      } catch (error) {
        console.warn('Mood history load failed:', error.message || error);
      }
    },
    [BACKEND_URL, formatMoodHistoryItem, token],
  );

  const extractJournalPayload = useCallback((journalAnswers = {}) => {
    const reflectionTexts = Object.entries(journalAnswers)
      .filter(([key]) => key !== 'doodle_standalone')
      .map(([, answer]) => answer?.text || '')
      .filter(answerText => answerText.trim());

    const doodleItems = Object.entries(journalAnswers)
      .map(([key, answer]) =>
        answer?.doodle ? {...answer.doodle, source: key} : null,
      )
      .filter(Boolean);

    return {
      reflection:
        reflectionTexts.length > 0 ? reflectionTexts.join('\n\n') : null,
      doodles: doodleItems.length > 0 ? JSON.stringify(doodleItems) : null,
      gentle_reminder: affirmationRef.current?.getAffirmation?.() || null,
    };
  }, []);

  const saveJournalForCurrentMood = useCallback(
    async journalAnswers => {
      if (!token || !moodData?.id) {
        return;
      }

      const payload = extractJournalPayload(journalAnswers);

      try {
        const response = await fetch(
          `${BACKEND_URL}/mood-log/${moodData.id}/journal`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          },
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Failed to save journal: ${response.status} ${errorText}`,
          );
        }

        const updatedLog = await response.json();
        const formatted = formatMoodHistoryItem(updatedLog);
        setMoodData(prev => ({...prev, ...formatted}));
        setMoodHistory(prev =>
          prev.map(item => (item.id === formatted.id ? formatted : item)),
        );
      } catch (error) {
        console.warn('Journal save failed:', error.message || error);
      }
    },
    [
      BACKEND_URL,
      extractJournalPayload,
      formatMoodHistoryItem,
      moodData?.id,
      token,
    ],
  );

  useEffect(() => {
    if (activeTab === 'history' && token) {
      fetchMoodHistory(token);
    }
  }, [activeTab, token, fetchMoodHistory]);

  const deleteMoodEntry = useCallback(
    async entryId => {
      if (!token) {
        return;
      }
      try {
        const response = await fetch(`${BACKEND_URL}/mood-log/${entryId}`, {
          method: 'DELETE',
          headers: {Authorization: `Bearer ${token}`},
        });
        if (!response.ok && response.status !== 204) {
          const errorText = await response.text();
          throw new Error(`Delete failed: ${response.status} ${errorText}`);
        }
        // Remove from local state immediately — no refetch needed
        setMoodHistory(prev =>
          prev.filter(
            item => item.id !== String(entryId) && item.id !== entryId,
          ),
        );
      } catch (error) {
        console.error('Delete mood entry error:', error);
        Alert.alert('Error', 'Could not delete this entry. Please try again.');
      }
    },
    [BACKEND_URL, token],
  );

  const saveMoodLog = useCallback(
    async (analysis, fallbackCaption, shouldFetchAnalytics = true) => {
      if (!token || !analysis) {
        return;
      }

      const shortCaption =
        analysis.short_caption ||
        analysis.short_description ||
        fallbackCaption ||
        analysis.vibe ||
        'Mood entry';
      const normalizedVibe = analysis.vibe || analysis.mood || 'unknown';
      const today = new Date().toDateString();

      const duplicateToday = moodHistory.find(item => {
        const itemDate = item.rawTimestamp ? new Date(item.rawTimestamp) : null;
        return (
          itemDate &&
          itemDate.toDateString() === today &&
          item.vibe === normalizedVibe &&
          item.caption === shortCaption
        );
      });

      if (duplicateToday) {
        console.log(
          'Duplicate mood log skipped: same entry already saved today.',
        );
        setMoodData(prev => ({...prev, ...duplicateToday}));
        return;
      }

      try {
        const journalPayload = extractJournalPayload(
          journalPromptsRef.current?.getAnswers?.() || {},
        );

        const response = await fetch(`${BACKEND_URL}/mood-log`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            vibe: analysis.vibe || analysis.mood || 'unknown',
            emoji: analysis.emoji || '',
            short_caption: shortCaption,
            color: analysis.color || '#6c5ce7',
            scene_tags: analysis.scene_tags || [],
            timestamp: new Date().toISOString(),
            image_path: analysis.image_path || null,
            audio_path: analysis.audio_path || null,
            description: analysis.description || '',
            feedback: analysis.feedback || '',
            poetic_summary: analysis.poetic_summary || '',
            confidence: analysis.confidence || '',
            gemini_confidence:
              analysis.gemini_confidence !== undefined &&
              analysis.gemini_confidence !== null
                ? analysis.gemini_confidence
                : null,
            environment_type: analysis.environment_type || '',
            color_palette: analysis.color_palette || [],
            secondary_moods: analysis.secondary_moods || [],
            all_scores: analysis.all_scores || [],
            prosody_analysis: analysis.prosody_analysis || null,
            reflection: journalPayload.reflection,
            doodles: journalPayload.doodles,
            gentle_reminder: journalPayload.gentle_reminder,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Failed to save mood log: ${response.status} ${errorText}`,
          );
        }

        const savedLog = await response.json();
        setMoodHistory(prev => {
          const formatted = formatMoodHistoryItem(
            savedLog,
            analysis.emoji || '',
          );
          if (prev.some(item => item.id === formatted.id)) {
            return prev;
          }
          return [formatted, ...prev];
        });
        setMoodData(prev => ({...prev, ...formatMoodHistoryItem(savedLog)}));
      } catch (error) {
        console.warn('Mood log save failed:', error.message || error);
      }
    },
    [
      BACKEND_URL,
      extractJournalPayload,
      formatMoodHistoryItem,
      token,
      moodHistory,
    ],
  );

  const saveInteractiveMoodEntry = useCallback(
    async ({
      vibe,
      emoji = '',
      caption,
      description = '',
      reflection = '',
      color = DESIGN_TOKENS.primary,
      sceneTags = [],
    }) => {
      if (!token) {
        return;
      }

      try {
        const response = await fetch(`${BACKEND_URL}/mood-log`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            vibe,
            emoji,
            short_caption: caption || description || vibe,
            color,
            scene_tags: sceneTags,
            timestamp: new Date().toISOString(),
            description,
            reflection,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Failed to save interactive entry: ${response.status} ${errorText}`,
          );
        }

        const savedLog = await response.json();
        const formatted = formatMoodHistoryItem(savedLog, emoji);
        setMoodHistory(prev =>
          prev.some(item => item.id === formatted.id)
            ? prev
            : [formatted, ...prev],
        );
        setMoodData(prev => ({...prev, ...formatted}));
        fetchAnalyticsData(token);
      } catch (error) {
        console.warn(
          'Interactive mood entry save failed:',
          error.message || error,
        );
      }
    },
    [BACKEND_URL, fetchAnalyticsData, formatMoodHistoryItem, token],
  );

  const onSpeechStart = useCallback(() => {
    setIsListening(true);
    setErrorMessage('');
    console.log('onSpeechStart');
  }, []);

  const onSpeechEnd = useCallback(() => {
    setIsListening(false);
    console.log('onSpeechEnd');
  }, []);

  const onSpeechResults = useCallback(event => {
    const transcript =
      event && event.value && event.value[0] ? event.value[0] : '';
    setText(transcript);
    console.log('onSpeechResults: ', transcript);
  }, []);

  const onSpeechPartialResults = useCallback(event => {
    const partial =
      event && event.value && event.value[0] ? event.value[0] : '';
    if (partial) {
      setText(partial);
    }
  }, []);

  const onSpeechError = useCallback(event => {
    const error = event && event.error ? event.error : event;
    const code = error && error.code ? error.code : 'unknown';
    const message =
      error && error.message ? error.message : 'Unknown voice error';

    // Friendly error handling
    if (code === '7' || code === '6') {
      setErrorMessage('No speech detected. Please try again.');
    } else if (code === '9') {
      setErrorMessage(
        'Microphone permission is missing. Please allow it and try again.',
      );
    } else if (code === '8') {
      setErrorMessage(
        'Speech recognition is busy. Please wait a moment and try again.',
      );
    } else if (code === '5') {
      setErrorMessage(
        'Speech recognition is unavailable on this device right now. Check Google voice services and try again.',
      );
    } else {
      setErrorMessage(`Error (${code}): ${message}`);
    }

    setIsListening(false);
    console.log('onSpeechError: ', error);
  }, []);

  useEffect(() => {
    Voice.onSpeechStart = onSpeechStart;
    Voice.onSpeechEnd = onSpeechEnd;
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechError = onSpeechError;
    Voice.onSpeechPartialResults = onSpeechPartialResults;

    Voice.isAvailable()
      .then(available => {
        setIsVoiceAvailable(Boolean(available));

        if (!available) {
          setErrorMessage(
            'Speech recognition is not available on this device.',
          );
          return Promise.resolve();
        }

        if (Platform.OS === 'android') {
          return Voice.getSpeechRecognitionServices().then(services => {
            if (!services || services.length === 0) {
              setErrorMessage(
                'No speech recognition service was found. Install or enable Google voice typing.',
              );
            }
          });
        }

        return Promise.resolve();
      })
      .catch(err => {
        console.warn(err);
        setIsVoiceAvailable(false);
        setErrorMessage('Unable to initialize speech recognition.');
      });

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, [
    onSpeechStart,
    onSpeechEnd,
    onSpeechResults,
    onSpeechError,
    onSpeechPartialResults,
  ]);

  // Fetch mood history and analytics when user authenticates
  useEffect(() => {
    if (isAuthenticated && token) {
      if (moodHistory.length === 0) {
        fetchMoodHistory(token);
      }
      // Also fetch analytics on authentication
      fetchAnalyticsData(token);
      fetchMoodGoal(token);
    }
  }, [
    isAuthenticated,
    token,
    fetchMoodHistory,
    fetchAnalyticsData,
    fetchMoodGoal,
    moodHistory.length,
  ]);

  const requestMicrophonePermission = useCallback(async () => {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const alreadyGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      );

      if (alreadyGranted) {
        return true;
      }

      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message:
            'This app needs access to your microphone to recognize speech.',
          buttonPositive: 'OK',
        },
      );

      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn(err);
      return false;
    }
  }, []);

  const requestCameraPermission = useCallback(async () => {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const alreadyGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.CAMERA,
      );

      if (alreadyGranted) {
        return true;
      }

      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'This app needs access to your camera to capture images.',
          buttonPositive: 'OK',
        },
      );

      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn(err);
      return false;
    }
  }, []);

  const requestStoragePermission = useCallback(async () => {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      let permission;
      // For Android 13 (API 33) and above, READ_MEDIA_IMAGES is used.
      // For Android 12 (API 32) and below, READ_EXTERNAL_STORAGE is used.
      if (Platform.Version >= 33) {
        permission = PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES;
      } else {
        permission = PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
      }

      const alreadyGranted = await PermissionsAndroid.check(permission);

      if (alreadyGranted) {
        return true;
      }

      const granted = await PermissionsAndroid.request(permission, {
        title: 'Storage Permission',
        message:
          'This app needs access to your photo gallery to select images.',
        buttonPositive: 'OK',
      });

      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn(err);
      return false;
    }
  }, []);

  /**
   * Request WRITE_EXTERNAL_STORAGE for saving photos to the gallery.
   * Only needed on Android < 10 (API level < 29). On API 29+ the system
   * handles gallery writes via MediaStore without needing this permission.
   */
  const requestWriteStoragePermission = useCallback(async () => {
    if (Platform.OS !== 'android') {
      return true;
    }
    // API 29 (Android 10) and above do not need WRITE_EXTERNAL_STORAGE
    if (Platform.Version >= 29) {
      return true;
    }
    try {
      const alreadyGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      );
      if (alreadyGranted) {
        return true;
      }
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        {
          title: 'Save Photo Permission',
          message: 'This app needs permission to save photos to your gallery.',
          buttonPositive: 'OK',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn(err);
      return false;
    }
  }, []);

  async function startListening() {
    if (isListening) {
      return;
    }

    try {
      setErrorMessage('');
      const hasPermission = await requestMicrophonePermission();

      if (!hasPermission) {
        setErrorMessage('Microphone permission denied');
        return;
      }

      const available = await Voice.isAvailable();
      if (!available) {
        setIsVoiceAvailable(false);
        setErrorMessage('Speech recognition is not available on this device.');
        return;
      }

      setIsVoiceAvailable(true);
      setText('');

      const recognizing = await Voice.isRecognizing();
      if (recognizing) {
        await Voice.cancel();
        // Give the native side a moment to fully release the session
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      await Voice.start('en-US', {
        EXTRA_PARTIAL_RESULTS: true,
        REQUEST_PERMISSIONS_AUTO: false,
      });
    } catch (e) {
      setIsListening(false);
      setErrorMessage(
        (e && e.message) ||
          'Failed to start voice recognition. Please try again.',
      );
      console.error(e);
    }
  }

  async function stopListening() {
    try {
      if (isListening) {
        await Voice.stop();
      }
      setIsListening(false);

      // We don't call analyzeMood(text) here because 'text' might be stale.
      // Instead, we wait for onSpeechResults to provide the final transcript
      // or we use the latest partial result if onSpeechResults is slow.
      // For immediate feedback after 'STOP', we'll use the current text state.
      // But we add a small check to ensure we don't analyze empty text.

      setTimeout(() => {
        if (!isAnalyzing && text.trim()) {
          analyzeMood(text);
        }
      }, 500); // Wait for the final transcript to settle
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  }

  const analyzeMood = async transcript => {
    if (!transcript.trim()) {
      return;
    }

    // Crisis check runs in parallel — non-blocking
    fetch(`${BACKEND_URL}/crisis-check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({text: transcript}),
    })
      .then(r => r.json())
      .then(d => {
        if (d.is_crisis) {
          setCrisisAlert(d);
        }
      })
      .catch(() => {});

    setIsAnalyzing(true);
    setErrorMessage('');
    try {
      const response = await fetch(`${BACKEND_URL}/analyze-mood`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: transcript,
          avatar_config: avatarConfig,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorDetail = errorText;
        try {
          errorDetail = JSON.parse(errorText)?.detail || errorText;
        } catch {
          // Keep the raw server response when it is not JSON.
        }
        throw new Error(
          `Server analysis error: ${response.status} ${errorDetail}`,
        );
      }

      const data = await response.json();
      setMoodData(prev => ({...prev, ...data}));
      await saveMoodLog(data, transcript);
    } catch (error) {
      console.error('Analysis error:', error);
      const isNetworkError = error?.message === 'Network request failed';
      setErrorMessage(
        isNetworkError
          ? 'Could not connect to mood server. Make sure it is running.'
          : error?.message || 'Mood analysis failed. Please try again.',
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeImageDescription = useCallback(
    async asset => {
      if (!asset || !asset.uri) {
        console.warn('No asset or URI provided to analyzeImageDescription');
        return;
      }
      setIsAnalyzing(true);
      setErrorMessage('');
      try {
        const isRemoteUrl =
          asset.uri.startsWith('http://') || asset.uri.startsWith('https://');
        const formData = new FormData();

        if (asset.base64) {
          formData.append('base64', asset.base64);
          formData.append('fileName', asset.fileName || 'photo.jpg');
          formData.append('type', asset.type || 'image/jpeg');
        } else if (isRemoteUrl) {
          formData.append('imageUrl', asset.uri);
          formData.append('fileName', asset.fileName || 'photo.jpg');
          formData.append('type', asset.type || 'image/jpeg');
        } else {
          formData.append('file', {
            uri:
              Platform.OS === 'android'
                ? asset.uri
                : asset.uri.replace('file://', ''),
            name: asset.fileName || 'photo.jpg',
            type: asset.type || 'image/jpeg',
          });
        }

        const response = await fetch(`${BACKEND_URL}/analyze-image`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Image analysis failed: ${response.status} ${errorText}`,
          );
        }

        const data = await response.json();
        setText(data.short_description);
        setMoodData(data); // Set the full Gemini results directly
        await saveMoodLog(data, data.short_description);
      } catch (error) {
        console.error('Image analysis error:', error);
        setErrorMessage('Could not describe the image. Is the server running?');
      } finally {
        setIsAnalyzing(false);
      }
    },
    [BACKEND_URL, saveMoodLog, token],
  );

  const handleCaptureImage = useCallback(async () => {
    if (isCapturingImage) {
      return;
    }

    // Safety timeout: always unlock the button after 30s even if launchCamera
    // never resolves (a known emulator / older device hang).
    let timeoutId;
    const resetCapturing = () => {
      clearTimeout(timeoutId);
      setIsCapturingImage(false);
    };

    try {
      setErrorMessage('');
      setIsCapturingImage(true);

      timeoutId = setTimeout(() => {
        console.warn('Camera timed out — resetting capture state.');
        setIsCapturingImage(false);
      }, 30000);

      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        Alert.alert('Permission needed', 'Camera permission was denied.');
        resetCapturing();
        return;
      }

      // Request write-storage permission so the photo can be saved to the
      // device gallery (required on Android < 10 / API < 29).
      await requestWriteStoragePermission();

      const result = await launchCamera({
        mediaType: 'photo',
        cameraType: 'back',
        maxWidth: 1024,
        maxHeight: 1024,
        quality: 0.7,
        // Save the captured photo directly to the device gallery.
        saveToPhotos: true,
        // Do NOT include base64 here — encoding a full-res photo on the JS
        // thread freezes the UI and causes the camera to appear stuck.
        // analyzeImageDescription handles plain file URIs directly.
        includeBase64: false,
      });

      if (result.didCancel) {
        resetCapturing();
        return;
      }

      if (result.errorCode) {
        Alert.alert(
          'Camera error',
          result.errorMessage || 'Unable to capture image.',
        );
        resetCapturing();
        return;
      }

      const asset = result.assets && result.assets[0];
      if (asset && asset.uri) {
        setImages(currentImages => [
          {
            id: `${Date.now()}`,
            uri: asset.uri,
            fileName: asset.fileName || `photo_${Date.now()}.jpg`,
            type: asset.type || 'image/jpeg',
          },
          ...currentImages,
        ]);
        analyzeImageDescription(asset);
      }
    } catch (error) {
      console.error(error);
      Alert.alert(
        'Camera error',
        'Something went wrong while opening the camera.',
      );
    } finally {
      resetCapturing();
    }
  }, [
    isCapturingImage,
    requestCameraPermission,
    requestWriteStoragePermission,
    analyzeImageDescription,
  ]);

  const handleSelectImage = useCallback(async () => {
    if (isSelectingImage) {
      return;
    }

    try {
      setErrorMessage('');
      setIsSelectingImage(true);

      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        Alert.alert('Permission needed', 'Storage permission was denied.');
        return;
      }

      const result = await launchImageLibrary({
        mediaType: 'photo',
        maxWidth: 1024,
        maxHeight: 1024,
        quality: 0.7,
        // Do NOT include base64 to avoid UI freezes on large images
        includeBase64: false,
      });

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        Alert.alert(
          'Image selection error',
          result.errorMessage || 'Unable to select image.',
        );
        return;
      }

      const asset = result.assets && result.assets[0];
      if (asset && asset.uri) {
        setImages(currentImages => [
          {
            id: `${Date.now()}`,
            uri: asset.uri,
            fileName: asset.fileName || `gallery_${Date.now()}.jpg`,
            type: asset.type || 'image/jpeg',
          },
          ...currentImages,
        ]);
        analyzeImageDescription(asset);
      }
    } catch (error) {
      console.error(error);
      Alert.alert(
        'Image selection error',
        'Something went wrong while selecting an image.',
      );
    } finally {
      setIsSelectingImage(false);
    }
  }, [isSelectingImage, requestStoragePermission, analyzeImageDescription]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      backgroundColor: appBgColor,
    },
    content: {
      paddingVertical: 40,
      alignItems: 'center',
      paddingBottom: 110,
    },
    statusText: {
      marginTop: 10,
      color: isListening
        ? '#f87171'
        : getContrastColor(appBgColor) === '#ffffff'
        ? 'rgba(255,255,255,0.6)'
        : '#9ca3af',
      fontWeight: '600',
      fontSize: 13,
    },
    error: {
      marginTop: 12,
      color: '#ef4444',
      textAlign: 'center',
      fontWeight: '500',
      fontSize: 13,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 14,
      marginBottom: 12,
      borderRadius: 14,
      alignSelf: 'flex-start',
      gap: 6,
      backgroundColor: `${DESIGN_TOKENS.primary}15`,
      borderWidth: 1,
      borderColor: `${DESIGN_TOKENS.primary}25`,
    },
    backButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: DESIGN_TOKENS.primary,
    },
    heroWrapper: {
      width: '100%',
      marginBottom: 28,
      paddingHorizontal: 2,
    },
    featureBlock: {
      width: '100%',
    },
    tabBar: {
      flexDirection: 'row',
      backgroundColor: DESIGN_TOKENS.surface,
      borderTopWidth: 1,
      borderTopColor: DESIGN_TOKENS.border,
      paddingBottom: Platform.OS === 'ios' ? 24 : 12,
      paddingTop: 10,
      paddingHorizontal: 8,
      justifyContent: 'space-around',
      elevation: 20,
      shadowColor: DESIGN_TOKENS.shadow,
      shadowOffset: {width: 0, height: -4},
      shadowOpacity: 0.08,
      shadowRadius: 16,
    },
    tabItem: {
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
      paddingVertical: 4,
    },
    tabIconWrap: {
      width: 44,
      height: 32,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabIconWrapActive: {
      backgroundColor: `${DESIGN_TOKENS.primary}15`,
    },
    tabText: {
      fontSize: 10,
      marginTop: 3,
      fontWeight: '700',
      letterSpacing: 0.2,
    },
    checkInBanner: {
      width: '100%',
      backgroundColor: DESIGN_TOKENS.surface,
      borderRadius: 20,
      padding: 18,
      marginBottom: 20,
      flexDirection: 'row',
      alignItems: 'center',
      elevation: 4,
      shadowColor: DESIGN_TOKENS.shadow,
      shadowOffset: {width: 0, height: 4},
      shadowOpacity: 0.1,
      shadowRadius: 12,
      borderWidth: 1,
      borderColor: '#ede9fe',
      overflow: 'hidden',
    },
    checkInAccent: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 4,
      backgroundColor: DESIGN_TOKENS.primary,
      borderTopLeftRadius: 20,
      borderBottomLeftRadius: 20,
    },
    checkInIconContainer: {
      width: 42,
      height: 42,
      borderRadius: 13,
      backgroundColor: `${DESIGN_TOKENS.primary}15`,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
      marginLeft: 8,
    },
    checkInText: {
      fontSize: 15,
      fontWeight: '800',
      color: DESIGN_TOKENS.textPrimary,
      flex: 1,
    },
    checkInSub: {
      fontSize: 12,
      color: DESIGN_TOKENS.textSecondary,
      fontWeight: '500',
      marginTop: 2,
    },
    crisisBanner: {
      width: '100%',
      backgroundColor: '#fff5f5',
      borderRadius: 16,
      padding: 16,
      marginTop: 8,
      borderWidth: 1.5,
      borderColor: '#fca5a5',
      gap: 6,
    },
    crisisBannerText: {
      fontSize: 14,
      color: '#b91c1c',
      fontWeight: '600',
      lineHeight: 20,
    },
    crisisResource: {
      fontSize: 12,
      color: '#dc2626',
      fontWeight: '500',
    },
    crisisDismiss: {
      alignSelf: 'flex-end',
      marginTop: 4,
      paddingVertical: 4,
      paddingHorizontal: 10,
      backgroundColor: '#fee2e2',
      borderRadius: 8,
    },
    crisisDismissText: {
      fontSize: 12,
      color: '#b91c1c',
      fontWeight: '700',
    },
  });

  const handleAuth = async (
    isLogin,
    email,
    password,
    name,
    avatarConfigParam,
  ) => {
    setIsAuthLoading(true);
    setAuthError('');
    setIsLoginFlow(isLogin);
    try {
      const endpoint = isLogin ? '/login' : '/signup';
      const body = isLogin
        ? {email, password}
        : {
            email,
            password,
            name,
            avatar_config: avatarConfigParam
              ? JSON.stringify(avatarConfigParam)
              : null,
          };
      const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Authentication failed');
      }

      setToken(data.access_token);
      setUserName(data.user_name || '');
      if (data.avatar_config) {
        try {
          setAvatarConfig(JSON.parse(data.avatar_config));
        } catch (e) {
          console.warn('Failed to parse avatar config from server', e);
        }
      }
      setIsAuthenticated(true);
      fetchMoodHistory(data.access_token);
      // Fetch user's saved photos
      try {
        const photosResponse = await fetch(`${BACKEND_URL}/user-photos`, {
          headers: {
            Authorization: `Bearer ${data.access_token}`,
          },
        });
        if (photosResponse.ok) {
          const photosData = await photosResponse.json();
          const photoImages = (photosData.photos || []).map(photo => ({
            id: `photo_${photo.mood_log_id}`,
            uri: `${BACKEND_URL}/${photo.image_path}`,
            fileName: photo.image_path.split('/').pop(),
            type: 'image/jpeg',
            vibe: photo.vibe,
            emoji: photo.emoji,
            caption: photo.short_caption,
            timestamp: photo.timestamp,
            color: photo.color,
          }));
          setImages(photoImages);
        }
      } catch (error) {
        console.warn('Failed to fetch user photos:', error);
      }
    } catch (error) {
      console.error('Auth error:', error);
      setAuthError(error.message || 'Could not connect to server.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setToken(null);
    setUserName('');
    setMoodData(null);
    setText('');
    setImages([]);
    setMoodHistory([]);
    setAppBgColor('#f5f5f5');
  };

  const handleVibeSelect = useCallback(vibe => {
    setText(`I'm feeling ${vibe} right now`);
  }, []);

  const handleBadgePress = useCallback(badge => {
    console.log('Badge earned:', badge.label);
    // Could add analytics tracking here
  }, []);

  const handleInteractiveTabChange = useCallback(tabId => {
    setActiveTab(tabId === 'journal' ? 'history' : tabId);
  }, []);

  const handleMoodTwinCheckIn = useCallback(
    checkIn => {
      saveInteractiveMoodEntry({
        vibe: checkIn.mood || 'neutral',
        emoji:
          checkIn.mood === 'happy' ? '🙂' : checkIn.mood === 'sad' ? '💙' : '',
        caption: checkIn.response,
        description: checkIn.response,
        reflection: checkIn.response,
        sceneTags: ['mood-twin', 'quick-check-in'],
      });
      if (['sad', 'anxious'].includes(checkIn.mood)) {
        handleOpenChat(
          `I'm feeling ${checkIn.mood}. Can you help me breathe for a minute?`,
        );
      }
    },
    [handleOpenChat, saveInteractiveMoodEntry],
  );

  const handleMoodDiceJournalEntry = useCallback(
    entry => {
      saveInteractiveMoodEntry({
        vibe:
          entry.category === 'gratitude' || entry.category === 'positive'
            ? 'grateful'
            : 'reflective',
        emoji: '✍️',
        caption: entry.prompt,
        description: `${entry.prompt}\n\n${entry.response}`,
        reflection: entry.response,
        sceneTags: ['mood-dice', entry.category],
        color: '#FFD93D',
      });
      setActiveTab('history');
    },
    [saveInteractiveMoodEntry],
  );

  const handleGemAdded = useCallback(
    gem => {
      setGratitudeGems(prev => [gem, ...prev].slice(0, 7));
      saveInteractiveMoodEntry({
        vibe: 'grateful',
        emoji: '💎',
        caption: 'Gratitude gem',
        description: gem.text,
        reflection: gem.text,
        sceneTags: ['gratitude-jar'],
        color: gem.color || '#FFD93D',
      });
    },
    [saveInteractiveMoodEntry],
  );

  const handlePlantTap = useCallback(
    plant => {
      const matchingEntry = moodHistory.find(
        item => item.vibe?.toLowerCase() === plant.label?.toLowerCase(),
      );
      if (matchingEntry) {
        setSelectedHistoryItem(matchingEntry);
        setActiveTab('history');
      }
    },
    [moodHistory],
  );

  if (!isAuthenticated) {
    return (
      <AuthScreen
        onAuth={handleAuth}
        isLoading={isAuthLoading}
        errorMessage={authError}
      />
    );
  }

  const handleClearSelection = () => {
    setSelectedHistoryItem(null);
  };

  const renderContent = () => {
    if (activeTab === 'analytics') {
      return (
        <>
          <View style={styles.featureBlock}>
            <MoodGarden
              analyticsData={journeyAnalyticsData}
              moodHistory={moodHistory}
              onPlantTap={handlePlantTap}
            />
          </View>

          <View style={styles.featureBlock}>
            <GoalAlignmentRing
              moodGoal={moodGoal}
              analyticsData={journeyAnalyticsData}
              onGoalUpdate={updateMoodGoal}
            />
          </View>

          <View style={styles.featureBlock}>
            <CelebrationCorner
              analyticsData={journeyAnalyticsData}
              moodHistory={moodHistory}
            />
          </View>

          <AnalyticsDisplay
            analyticsData={analyticsData}
            appBgColor={appBgColor}
            isLoading={!analyticsData}
            onRefresh={() => fetchAnalyticsData(token)}
            moodGoal={moodGoal}
            onUpdateGoal={updateMoodGoal}
            moodHistory={moodHistory}
            token={token}
            backendUrl={BACKEND_URL}
          />
        </>
      );
    } else if (activeTab === 'history') {
      if (selectedHistoryItem) {
        return (
          <>
            <TouchableOpacity
              onPress={handleClearSelection}
              style={styles.backButton}
              activeOpacity={0.7}>
              <Icon name="arrow-left" size={18} color={DESIGN_TOKENS.primary} />
              <Text style={styles.backButtonText}>Back to Journal</Text>
            </TouchableOpacity>
            <MoodResult
              moodData={selectedHistoryItem}
              token={token}
              backendUrl={BACKEND_URL}
              isAnalyzing={false}
              isListening={false}
              hasText={!!selectedHistoryItem.description}
              setAppBgColor={setAppBgColor}
              appBgColor={appBgColor}
            />
          </>
        );
      }
      return (
        <HistoryDisplay
          moodHistory={moodHistory}
          appBgColor={appBgColor}
          onSelect={item => setSelectedHistoryItem(item)}
          onDelete={deleteMoodEntry}
        />
      );
    } else {
      return (
        <>
          <View style={styles.featureBlock}>
            <MoodTwin
              onCheckIn={handleMoodTwinCheckIn}
              onTabChange={handleInteractiveTabChange}
            />
          </View>

          <View style={styles.featureBlock}>
            <MoodDice
              onJournalEntry={handleMoodDiceJournalEntry}
              onTabChange={handleInteractiveTabChange}
            />
          </View>

          <View style={styles.featureBlock}>
            <MoodJar
              onGemAdded={handleGemAdded}
              onJarFull={() => {
                fetchAnalyticsData(token);
                setActiveTab('analytics');
              }}
            />
          </View>

          {/* Weekly AI Summary */}
          <WeeklySummaryCard token={token} backendUrl={BACKEND_URL} />

          {/* Mood Forecast */}
          <MoodForecastCard token={token} backendUrl={BACKEND_URL} />

          {/* Habit Recommendations */}
          <HabitRecommendations
            token={token}
            backendUrl={BACKEND_URL}
            moodHistory={moodHistory}
            moodGoal={moodGoal}
          />

          {/* Trigger Insights */}
          <TriggerInsightsCard
            token={token}
            backendUrl={BACKEND_URL}
            days={30}
          />

          {/* Streak & Badges Overview */}
          <StreakBadges
            moodHistory={moodHistory}
            userName={userName}
            appBgColor={appBgColor}
            onPressBadge={handleBadgePress}
          />

          {/* Mood Companion — contextual question */}
          <MoodCompanion
            moodHistory={moodHistory}
            userName={userName}
            token={token}
            backendUrl={BACKEND_URL}
            onQuestionSelect={setText}
            appBgColor={appBgColor}
          />

          {!hasLoggedToday && (
            <View style={styles.checkInBanner}>
              <View style={styles.checkInAccent} />
              <View style={styles.checkInIconContainer}>
                <Icon
                  name="star-shooting"
                  size={20}
                  color={DESIGN_TOKENS.primary}
                />
              </View>
              <View style={{flex: 1}}>
                <Text style={styles.checkInText}>
                  How are you feeling today?
                </Text>
                <Text style={styles.checkInSub}>
                  Tap the mic to start your check-in
                </Text>
              </View>
            </View>
          )}
          <MoodPatternWarning
            moodHistory={moodHistory}
            appBgColor={appBgColor}
            onOpenChat={handleOpenChat}
          />
          <VibeSuggestions
            moodGoal={moodGoal}
            onSelectVibe={handleVibeSelect}
            onUpdateGoal={updateMoodGoal}
            appBgColor={appBgColor}
          />
          <VoiceInput
            text={text}
            onChangeText={setText}
            isListening={isListening}
            onStartListening={startListening}
            onStopListening={stopListening}
            onAnalyze={() => analyzeMood(text)}
            isAnalyzing={isAnalyzing}
            appBgColor={appBgColor}
            shortDescription={moodData?.short_description}
            longDescription={moodData?.description}
          />

          <Text style={styles.statusText}>
            {isListening
              ? 'Recording active...'
              : isVoiceAvailable
              ? 'Tap button to start'
              : 'Speech recognition unavailable'}
          </Text>
          {!!errorMessage && <Text style={styles.error}>{errorMessage}</Text>}

          {!!crisisAlert && (
            <View style={styles.crisisBanner}>
              <Text style={styles.crisisBannerText}>{crisisAlert.message}</Text>
              {crisisAlert.resources?.map((r, i) => (
                <Text key={i} style={styles.crisisResource}>
                  • {r.name}: {r.contact}
                </Text>
              ))}
              <TouchableOpacity
                onPress={() => setCrisisAlert(null)}
                style={styles.crisisDismiss}>
                <Text style={styles.crisisDismissText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          )}

          <MoodResult
            moodData={moodData}
            token={token}
            backendUrl={BACKEND_URL}
            isAnalyzing={isAnalyzing}
            isListening={isListening}
            hasText={text.length > 0}
            setAppBgColor={setAppBgColor}
            appBgColor={appBgColor}
          />

          <AffirmationBanner
            ref={affirmationRef}
            vibe={moodData?.vibe}
            moodColor={moodData?.color}
            token={token}
            backendUrl={BACKEND_URL}
            savedAffirmation={moodData?.gentle_reminder}
          />

          <JournalPrompts
            ref={journalPromptsRef}
            vibe={moodData?.vibe}
            description={moodData?.description}
            token={token}
            backendUrl={BACKEND_URL}
            savedReflection={moodData?.reflection}
            savedDoodles={moodData?.doodles}
            onJournalChange={saveJournalForCurrentMood}
          />

          <ImageGallery
            images={images}
            sampleImages={SAMPLE_IMAGES}
            onCapture={handleCaptureImage}
            onSelect={handleSelectImage}
            onAnalyzeImage={analyzeImageDescription}
            isCapturingImage={isCapturingImage}
            isSelectingImage={isSelectingImage}
            isAnalyzing={isAnalyzing}
          />
        </>
      );
    }
  };

  return (
    <View style={{flex: 1, backgroundColor: appBgColor}}>
      {activeTab === 'chat' ? (
        // TherapistChat contains a FlatList — must NOT be inside a ScrollView
        <TherapistChat
          token={token}
          backendUrl={BACKEND_URL}
          vibeContext={moodData?.vibe}
          initialPrompt={chatInitialPrompt}
          onClose={() => {
            setActiveTab('home');
            setChatInitialPrompt('');
          }}
        />
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          <View style={styles.heroWrapper}>
            <DashboardHero
              appBgColor={appBgColor}
              avatarAnim={avatarAnim}
              avatarConfig={avatarConfig}
              isLoginFlow={isLoginFlow}
              onEditAvatar={() => setAvatarVisible(true)}
              onLogout={handleLogout}
              onOpenHistory={() => setActiveTab('history')}
              userName={userName}
            />
          </View>

          {renderContent()}

          <AvatarBuilder
            visible={avatarVisible}
            onClose={() => setAvatarVisible(false)}
            onSave={async (config, svgString) => {
              setAvatarConfig(config);
              setAvatarVisible(false);
              try {
                await fetch(`${BACKEND_URL}/update-avatar`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify(config),
                }).then(response => {
                  if (!response.ok) {
                    throw new Error('Failed to save avatar.');
                  }
                  Alert.alert('Success', 'Avatar updated successfully!');
                });
              } catch (error) {
                console.error('Failed to update avatar:', error);
                Alert.alert(
                  'Error',
                  error.message || 'Failed to update avatar.',
                );
              }
            }}
          />
        </ScrollView>
      )}

      <View style={styles.tabBar}>
        {[
          {id: 'home', icon: 'home-variant', label: 'Home'},
          {id: 'chat', icon: 'chat-processing-outline', label: 'Chat'},
          {id: 'history', icon: 'book-open-page-variant', label: 'Journal'},
          {id: 'analytics', icon: 'chart-areaspline', label: 'Insights'},
        ].map(tab => {
          const active = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabItem}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.7}>
              <View
                style={[
                  styles.tabIconWrap,
                  active && styles.tabIconWrapActive,
                ]}>
                <Icon
                  name={tab.icon}
                  size={22}
                  color={
                    active ? DESIGN_TOKENS.primary : DESIGN_TOKENS.primaryLight
                  }
                />
              </View>
              <Text
                style={[
                  styles.tabText,
                  {
                    color: active
                      ? DESIGN_TOKENS.primary
                      : DESIGN_TOKENS.primaryLight,
                  },
                ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default App;
