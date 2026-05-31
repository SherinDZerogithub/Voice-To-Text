/**
 * GoalCompletionModal.jsx
 *
 * Handles two states:
 *  - COMPLETE  (goalProgress >= threshold): Animated celebration + AI insight popup + save
 *  - FAILED    (goalProgress < threshold after 7 days): Reflective goal failed popup
 *  - INCOMPLETE (goalProgress < threshold): Warm, contextual encouragement popup
 *
 * Props:
 *  visible         boolean
 *  onClose         () => void
 *  goalVibe        string          e.g. "calm"
 *  goalProgress    number 0–1      e.g. 0.72
 *  goalCount       number          e.g. 14
 *  totalLogs       number          e.g. 20
 *  moodHistory     array           recent mood log items for context
 *  token           string          JWT for Claude API (passed through)
 *  onSaveInsight   (text) => void  called when user saves the insight
 *  goalFailed      boolean         true when the 7-day focus ended below target
 *
 * The COMPLETE threshold is >=30% (goal vibe is at least 30% of all logs).
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// ─── Constants ────────────────────────────────────────────────────────────────

const COMPLETION_THRESHOLD = 0.30; // 30 % of logs = "achieved"

const VIBE_META = {
  calm:        { color: '#A8E6CF', darkColor: '#2d8a5e', emoji: '😌' },
  peaceful:    { color: '#B2E2F2', darkColor: '#2980b9', emoji: '🕊️' },
  serene:      { color: '#D4F1F4', darkColor: '#16a0b5', emoji: '🧘' },
  minimalist:  { color: '#D0D0D0', darkColor: '#555',    emoji: '⚪' },
  happy:       { color: '#FFDE7D', darkColor: '#c9930a', emoji: '😊' },
  energetic:   { color: '#FFD93D', darkColor: '#c9930a', emoji: '⚡' },
  playful:     { color: '#FF8B94', darkColor: '#c0392b', emoji: '🎈' },
  vibrant:     { color: '#6BCB77', darkColor: '#27ae60', emoji: '🌈' },
  sad:         { color: '#A2D2FF', darkColor: '#2980b9', emoji: '😢' },
  lonely:      { color: '#6C757D', darkColor: '#444',    emoji: '👤' },
  pensive:     { color: '#4A4E69', darkColor: '#2d3436', emoji: '🤔' },
  gloomy:      { color: '#9A8C98', darkColor: '#555',    emoji: '☁️' },
  anxious:     { color: '#D4A5A5', darkColor: '#a93226', emoji: '😰' },
  chaotic:     { color: '#E94560', darkColor: '#c0392b', emoji: '🌀' },
  intense:     { color: '#FF4D4D', darkColor: '#c0392b', emoji: '🔥' },
  gritty:      { color: '#545B64', darkColor: '#2d3436', emoji: '⛓️' },
  nostalgic:   { color: '#FFAAA5', darkColor: '#c0392b', emoji: '📺' },
  romantic:    { color: '#FFB7B2', darkColor: '#c0392b', emoji: '❤️' },
  mystical:    { color: '#9D4EDD', darkColor: '#6c3483', emoji: '✨' },
  vintage:     { color: '#B08968', darkColor: '#7d5d3b', emoji: '🎞️' },
  cozy:        { color: '#E6A15C', darkColor: '#a04000', emoji: '🕯️' },
  ethereal:    { color: '#B8C0FF', darkColor: '#5c6bc0', emoji: '🌫️' },
  melancholic: { color: '#4E6E81', darkColor: '#2c3e50', emoji: '🥀' },
  industrial:  { color: '#545B64', darkColor: '#2d3436', emoji: '⚙️' },
  natural:     { color: '#4A7C59', darkColor: '#1e8449', emoji: '🌲' },
  futuristic:  { color: '#00F5D4', darkColor: '#00796b', emoji: '🤖' },
  bold:        { color: '#F15BB5', darkColor: '#8e44ad', emoji: '🏎️' },
  solitary:    { color: '#8D99AE', darkColor: '#4a5568', emoji: '🏔️' },
  tense:       { color: '#D90429', darkColor: '#922b21', emoji: '⚠️' },
  hopeful:     { color: '#FEE440', darkColor: '#b7950b', emoji: '🌅' },
};

const getMeta = vibe =>
  VIBE_META[vibe?.toLowerCase()] || { color: '#6c5ce7', darkColor: '#4a2c8a', emoji: '🌈' };

// ─── Confetti Particle ────────────────────────────────────────────────────────

const CONFETTI_COLORS = [
  '#FF6B6B', '#FFE66D', '#4ECDC4', '#A8E6CF',
  '#C3A6FF', '#FF8B94', '#6BCB77', '#74B9FF',
];

const ConfettiParticle = ({ color, startX, delay, screenW }) => {
  const y = useRef(new Animated.Value(-20)).current;
  const x = useRef(new Animated.Value(startX)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const drift = (Math.random() - 0.5) * 120;
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(y, {
          toValue: 520,
          duration: 2200 + Math.random() * 800,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(x, {
          toValue: startX + drift,
          duration: 2200 + Math.random() * 800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(rotate, {
          toValue: 6,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(1600),
          Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]),
      ]),
    ]).start();
  }, []);

  const spin = rotate.interpolate({
    inputRange: [0, 6],
    outputRange: ['0deg', '720deg'],
  });

  const size = 7 + Math.random() * 7;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: size,
        height: size * (Math.random() > 0.5 ? 1 : 0.4),
        borderRadius: Math.random() > 0.5 ? size : 1,
        backgroundColor: color,
        opacity,
        transform: [
          { translateX: x },
          { translateY: y },
          { rotate: spin },
        ],
      }}
    />
  );
};

const ConfettiLayer = ({ count = 48, containerWidth = 340 }) => {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        startX: Math.random() * containerWidth,
        delay: Math.random() * 700,
      })),
    [],
  );

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {particles.map(p => (
        <ConfettiParticle key={p.id} {...p} screenW={containerWidth} />
      ))}
    </View>
  );
};

// ─── Typing text animation ────────────────────────────────────────────────────

const TypingText = ({ text, style, speed = 18 }) => {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    setDisplayed('');
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [text]);

  return <Text style={style}>{displayed}</Text>;
};

// ─── AI Insight fetcher ───────────────────────────────────────────────────────

const buildInsightPrompt = (goalVibe, goalCount, totalLogs, percent, moodHistory) => {
  const recentVibes = moodHistory
    .slice(0, 10)
    .map(h => h.vibe || h.mood)
    .filter(Boolean)
    .join(', ');

  return `You are a warm, emotionally intelligent life coach AI embedded in a mood-tracking app called Scene Vibe.

The user has ACHIEVED their mood goal this period. Here's the data:
- Goal vibe: "${goalVibe}"
- Goal entries: ${goalCount} out of ${totalLogs} total (${percent}% of all moods)
- Their recent mood log vibes: ${recentVibes || 'not available'}

Write a short personal insight (3–4 sentences) for them. Rules:
1. Be warm, celebratory, and specific to the vibe "${goalVibe}".
2. Mention what achieving this vibe says about them as a person.
3. End with one forward-looking sentence — a gentle invitation, not pressure.
4. Write in second person ("you", "your"). Never use the word "journey".
5. Sound like a real human who knows them — not a chatbot. No emojis in the text.
6. Keep it under 80 words.`;
};

const fetchAIInsight = async (goalVibe, goalCount, totalLogs, percent, moodHistory) => {
  const prompt = buildInsightPrompt(goalVibe, goalCount, totalLogs, percent, moodHistory);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) throw new Error('AI fetch failed');
  const data = await response.json();
  return data.content?.[0]?.text?.trim() || '';
};

// ─── COMPLETE modal content ────────────────────────────────────────────────────

const CompleteContent = ({ goalVibe, goalCount, totalLogs, goalProgress, moodHistory, onSaveInsight, onClose }) => {
  const meta = getMeta(goalVibe);
  const percent = Math.round(goalProgress * 100);

  const [insight, setInsight] = useState('');
  const [insightLoading, setInsightLoading] = useState(true);
  const [insightError, setInsightError] = useState(false);
  const [saved, setSaved] = useState(false);

  const headerScale = useRef(new Animated.Value(0.5)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const statsSlide = useRef(new Animated.Value(30)).current;
  const statsOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(headerScale, { toValue: 1, tension: 55, friction: 7, useNativeDriver: true }),
      Animated.timing(headerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.spring(statsSlide, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
        Animated.timing(statsOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]).start();
    }, 350);

    // Fetch AI insight
    fetchAIInsight(goalVibe, goalCount, totalLogs, percent, moodHistory)
      .then(text => {
        setInsight(text);
        setInsightLoading(false);
      })
      .catch(() => {
        setInsightError(true);
        setInsightLoading(false);
      });
  }, []);

  const handleSave = () => {
    if (!insight || saved) return;
    onSaveInsight && onSaveInsight(insight);
    setSaved(true);
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={completeStyles.scroll}>

      {/* Confetti */}
      <ConfettiLayer count={52} containerWidth={330} />

      {/* Crown / emoji hero */}
      <Animated.View
        style={[
          completeStyles.heroWrap,
          { opacity: headerOpacity, transform: [{ scale: headerScale }] },
        ]}>
        <View style={[completeStyles.heroBg, { backgroundColor: meta.color + '30' }]}>
          <Text style={completeStyles.heroEmoji}>{meta.emoji}</Text>
          <View style={completeStyles.crownBadge}>
            <Text style={{ fontSize: 18 }}>🏆</Text>
          </View>
        </View>
      </Animated.View>

      <Animated.View style={{ opacity: headerOpacity }}>
        <Text style={completeStyles.title}>Goal Achieved!</Text>
        <Text style={[completeStyles.vibeName, { color: meta.darkColor }]}>
          {goalVibe.toUpperCase()}
        </Text>
      </Animated.View>

      {/* Stats row */}
      <Animated.View
        style={[
          completeStyles.statsRow,
          { opacity: statsOpacity, transform: [{ translateY: statsSlide }] },
        ]}>
        <View style={[completeStyles.statPill, { backgroundColor: meta.color + '25' }]}>
          <Text style={[completeStyles.statNum, { color: meta.darkColor }]}>{goalCount}</Text>
          <Text style={completeStyles.statLabel}>logged</Text>
        </View>
        <View style={[completeStyles.statDivider]} />
        <View style={[completeStyles.statPill, { backgroundColor: meta.color + '25' }]}>
          <Text style={[completeStyles.statNum, { color: meta.darkColor }]}>{percent}%</Text>
          <Text style={completeStyles.statLabel}>of your vibes</Text>
        </View>
        <View style={[completeStyles.statDivider]} />
        <View style={[completeStyles.statPill, { backgroundColor: meta.color + '25' }]}>
          <Text style={[completeStyles.statNum, { color: meta.darkColor }]}>{totalLogs}</Text>
          <Text style={completeStyles.statLabel}>total entries</Text>
        </View>
      </Animated.View>

      {/* AI Insight card */}
      <View style={completeStyles.insightCard}>
        <View style={completeStyles.insightHeader}>
          <View style={[completeStyles.insightIconWrap, { backgroundColor: meta.color + '25' }]}>
            <Icon name="brain" size={18} color={meta.darkColor} />
          </View>
          <Text style={completeStyles.insightTitle}>Personal Insight</Text>
          <View style={completeStyles.aiBadge}>
            <Text style={completeStyles.aiBadgeText}>AI</Text>
          </View>
        </View>

        {insightLoading && (
          <View style={completeStyles.insightLoadingRow}>
            <ActivityIndicator size="small" color={meta.darkColor} />
            <Text style={[completeStyles.insightLoadingText, { color: meta.darkColor }]}>
              Generating your insight…
            </Text>
          </View>
        )}

        {!insightLoading && insightError && (
          <Text style={completeStyles.insightError}>
            Couldn't load insight right now. Your achievement still stands! 🌟
          </Text>
        )}

        {!insightLoading && !insightError && insight && (
          <TypingText
            text={insight}
            style={completeStyles.insightText}
            speed={16}
          />
        )}

        {/* Save button */}
        {!insightLoading && !insightError && insight && (
          <TouchableOpacity
            style={[
              completeStyles.saveBtn,
              { backgroundColor: saved ? '#e8faf0' : meta.color + '22', borderColor: saved ? '#2d8a5e' : meta.color },
            ]}
            onPress={handleSave}
            activeOpacity={0.75}
            disabled={saved}>
            <Icon
              name={saved ? 'check-circle' : 'bookmark-outline'}
              size={17}
              color={saved ? '#2d8a5e' : meta.darkColor}
            />
            <Text style={[completeStyles.saveBtnText, { color: saved ? '#2d8a5e' : meta.darkColor }]}>
              {saved ? 'Saved to Journal ✓' : 'Save to Journal'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Close */}
      <TouchableOpacity style={completeStyles.closeBtn} onPress={onClose} activeOpacity={0.7}>
        <Text style={completeStyles.closeBtnText}>Keep thriving 🌟</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const completeStyles = StyleSheet.create({
  scroll: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  heroWrap: { marginBottom: 16, position: 'relative' },
  heroBg: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  heroEmoji: { fontSize: 54 },
  crownBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#fff',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1a1a2e',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  vibeName: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 3,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    marginBottom: 22,
    backgroundColor: '#f8f8ff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ebebff',
  },
  statPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e0dfff',
  },
  statNum: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 10,
    color: '#999',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginTop: 1,
  },
  insightCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#eee',
    elevation: 3,
    shadowColor: '#6c5ce7',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    marginBottom: 20,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  insightIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  aiBadge: {
    backgroundColor: '#6c5ce7',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  aiBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  insightLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  insightLoadingText: {
    fontSize: 13,
    fontWeight: '600',
  },
  insightError: {
    fontSize: 14,
    color: '#888',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  insightText: {
    fontSize: 15,
    color: '#2d3436',
    lineHeight: 24,
    fontStyle: 'italic',
    letterSpacing: 0.1,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    alignSelf: 'flex-start',
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  closeBtn: {
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 28,
    backgroundColor: '#1a1a2e',
  },
  closeBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.2,
  },
});

// ─── INCOMPLETE modal content ─────────────────────────────────────────────────

const INCOMPLETE_MESSAGES = {
  // vibe-specific messages
  calm:        { headline: 'Peace takes practice', body: 'Stillness isn\'t always easy to reach — especially on busy days. Each breath of calm you logged still counted.', tip: 'Try 3 minutes of stillness tomorrow morning.', icon: 'meditation' },
  peaceful:    { headline: 'The quiet is still there', body: 'Peace doesn\'t always show up on schedule. It\'s enough that you were looking for it.', tip: 'A short walk without your phone can open the door.', icon: 'walk' },
  happy:       { headline: 'Joy doesn\'t run on demand', body: 'You can\'t force a smile, but you can create small conditions for one. That counts for everything.', tip: 'One thing tomorrow: something that makes you laugh.', icon: 'emoticon-happy-outline' },
  energetic:   { headline: 'Energy follows sleep and food', body: 'Some weeks the tank runs low — that\'s human biology, not failure. Recharge first.', tip: 'Check in on your sleep and hydration today.', icon: 'lightning-bolt-outline' },
  hopeful:     { headline: 'Hope flickers, not fails', body: 'Even a little hope is worth more than a lot of certainty. You\'re still here, still trying.', tip: 'Write down one small thing you\'re looking forward to.', icon: 'weather-sunset' },
  cozy:        { headline: 'Comfort is always available', body: 'Coziness is a state you can build, not just find. Looks like this week called for something else.', tip: 'Light a candle or make something warm to drink tonight.', icon: 'candle' },
  default:     { headline: 'Goals are compasses, not cages', body: 'Not every week lands where we aimed. That doesn\'t erase the effort you put in — it just means you\'re human.', tip: 'Look at what you actually felt. That\'s real data too.', icon: 'compass-outline' },
};

const getIncompleteMessage = vibe => {
  return INCOMPLETE_MESSAGES[vibe?.toLowerCase()] || INCOMPLETE_MESSAGES.default;
};

const buildWeeklyReview = ({
  goalVibe,
  goalCount,
  totalLogs,
  goalProgress,
  weeklyMoodCounts = {},
  weeklyBreakdown = [],
}) => {
  const goalKey = goalVibe?.toLowerCase();
  const targetCount = totalLogs > 0 ? Math.ceil(totalLogs * COMPLETION_THRESHOLD) : 0;
  const entriesNeeded = Math.max(0, targetCount - goalCount);
  const topVibes = Object.entries(weeklyMoodCounts || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const bestGoalDay = (weeklyBreakdown || []).reduce((best, day) => {
    const dayFrequency = day?.mood_frequency || {};
    const count = dayFrequency[goalKey] || dayFrequency[goalVibe] || 0;
    return count > (best?.count || 0) ? {...day, count} : best;
  }, null);

  return {
    percent: Math.round(goalProgress * 100),
    targetPercent: Math.round(COMPLETION_THRESHOLD * 100),
    entriesNeeded,
    topVibes,
    bestGoalDay,
  };
};

const IncompleteContent = ({
  goalVibe,
  goalCount,
  totalLogs,
  goalProgress,
  goalFailed,
  weeklyMoodCounts,
  weeklyBreakdown,
  onClose,
}) => {
  const meta = getMeta(goalVibe);
  const [showReview, setShowReview] = useState(false);
  const msg = goalFailed
    ? {
        headline: 'Fresh Start This Week',
        body:
          'The 7-day focus wrapped before this vibe reached the target. That is useful feedback, not a dead end.',
        tip: 'Choose a fresh feel-good focus, or keep this vibe and make it easier to notice tomorrow.',
        icon: 'creation-outline',
      }
    : getIncompleteMessage(goalVibe);
  const percent = Math.round(goalProgress * 100);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    // Entrance
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 55, friction: 8, useNativeDriver: true }),
    ]).start();

    // Gentle shake of the progress arc to signal "almost"
    setTimeout(() => {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 6, duration: 80, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -6, duration: 80, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 4, duration: 70, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 70, useNativeDriver: true }),
      ]).start();
    }, 500);
  }, []);

  // Simple arc progress indicator
  const clampedPct = Math.min(percent, 99);
  const review = buildWeeklyReview({
    goalVibe,
    goalCount,
    totalLogs,
    goalProgress,
    weeklyMoodCounts,
    weeklyBreakdown,
  });

  const handlePrimaryPress = () => {
    if (goalFailed && !showReview) {
      setShowReview(true);
      return;
    }
    onClose();
  };

  if (goalFailed && showReview) {
    return (
      <Animated.View
        style={[
          incompleteStyles.container,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}>
        <View style={[incompleteStyles.reviewIcon, { backgroundColor: meta.color + '18' }]}>
          <Icon name="clipboard-text-search-outline" size={34} color={meta.darkColor} />
        </View>

        <Text style={incompleteStyles.headline}>Your Week in Review</Text>
        <Text style={incompleteStyles.vibe} numberOfLines={1}>
          {goalVibe?.toUpperCase()} goal - {review.percent}% of entries
        </Text>

        <View style={incompleteStyles.reviewGrid}>
          <View style={incompleteStyles.reviewStat}>
            <Text style={[incompleteStyles.reviewStatValue, { color: meta.darkColor }]}>
              {goalCount}/{totalLogs}
            </Text>
            <Text style={incompleteStyles.reviewStatLabel}>target vibe logs</Text>
          </View>
          <View style={incompleteStyles.reviewStat}>
            <Text style={[incompleteStyles.reviewStatValue, { color: meta.darkColor }]}>
              {review.entriesNeeded}
            </Text>
            <Text style={incompleteStyles.reviewStatLabel}>more to hit {review.targetPercent}%</Text>
          </View>
        </View>

        <View style={incompleteStyles.reviewCard}>
          <Text style={incompleteStyles.reviewCardTitle}>What showed up most</Text>
          {review.topVibes.length > 0 ? (
            review.topVibes.map(([vibe, count]) => (
              <View key={vibe} style={incompleteStyles.reviewRow}>
                <Text style={incompleteStyles.reviewRowText}>{vibe}</Text>
                <Text style={[incompleteStyles.reviewRowCount, { color: getMeta(vibe).darkColor }]}>
                  {count}
                </Text>
              </View>
            ))
          ) : (
            <Text style={incompleteStyles.reviewEmpty}>
              No mood entries landed in this 7-day window.
            </Text>
          )}
        </View>

        <View style={[incompleteStyles.tipCard, { borderColor: meta.color + '50', backgroundColor: meta.color + '0E' }]}>
          <Icon name="lightbulb-on-outline" size={18} color={meta.darkColor} style={{ marginRight: 10 }} />
          <Text style={[incompleteStyles.tipText, { color: meta.darkColor }]}>
            {review.bestGoalDay?.count > 0
              ? `${goalVibe} appeared most on ${review.bestGoalDay.date?.slice(5)}. Try repeating what helped that day.`
              : `Try making ${goalVibe} easier to notice: log one tiny moment when it appears, even if it is brief.`}
          </Text>
        </View>

        <View style={incompleteStyles.footerRow}>
          <TouchableOpacity
            style={[incompleteStyles.keepBtn, { backgroundColor: meta.color }]}
            onPress={onClose}
            activeOpacity={0.8}>
            <Text style={incompleteStyles.keepBtnText}>Done</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={incompleteStyles.dismissBtn}
            onPress={() => setShowReview(false)}
            activeOpacity={0.7}>
            <Text style={incompleteStyles.dismissBtnText}>Back</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        incompleteStyles.container,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}>

      {/* Animated arc progress indicator */}
      <Animated.View style={{ transform: [{ translateX: shakeAnim }], marginBottom: 18 }}>
        <View style={[incompleteStyles.arcOuter, { borderColor: meta.color + '30' }]}>
          <View style={[incompleteStyles.arcInner, { backgroundColor: meta.color + '18' }]}>
            <Text style={incompleteStyles.arcEmoji}>{meta.emoji}</Text>
            <Text style={[incompleteStyles.arcPercent, { color: meta.darkColor }]}>{clampedPct}%</Text>
            <Text style={incompleteStyles.arcLabel}>reached</Text>
          </View>
          {/* Progress ring simulation via border */}
          <View
            style={[
              incompleteStyles.arcRing,
              {
                borderColor: meta.color,
                borderTopColor: clampedPct > 25 ? meta.color : 'transparent',
                borderRightColor: clampedPct > 50 ? meta.color : 'transparent',
                borderBottomColor: clampedPct > 75 ? meta.color : 'transparent',
              },
            ]}
          />
        </View>
      </Animated.View>

      <Text style={incompleteStyles.headline}>{msg.headline}</Text>
      <Text style={incompleteStyles.vibe} numberOfLines={1}>
        {goalVibe?.toUpperCase()} · {goalCount}/{totalLogs} entries
      </Text>

      <Text style={incompleteStyles.body}>{msg.body}</Text>

      {/* Tip card */}
      <View style={[incompleteStyles.tipCard, { borderColor: meta.color + '50', backgroundColor: meta.color + '0E' }]}>
        <Icon name={msg.icon} size={18} color={meta.darkColor} style={{ marginRight: 10 }} />
        <Text style={[incompleteStyles.tipText, { color: meta.darkColor }]}>
          {msg.tip}
        </Text>
      </View>

      {/* Encouraging footer */}
      <View style={incompleteStyles.footerRow}>
        <TouchableOpacity
          style={[incompleteStyles.keepBtn, { backgroundColor: meta.color }]}
          onPress={handlePrimaryPress}
          activeOpacity={0.8}>
          <Text style={incompleteStyles.keepBtnText}>
            {goalFailed ? 'Find the bright spot' : 'Keep this goal 💪'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={incompleteStyles.dismissBtn}
          onPress={onClose}
          activeOpacity={0.7}>
          <Text style={incompleteStyles.dismissBtnText}>Maybe later</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const incompleteStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 24,
  },
  arcOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  arcRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
  },
  arcInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arcEmoji: { fontSize: 30, marginBottom: 2 },
  arcPercent: { fontSize: 16, fontWeight: '900' },
  arcLabel: { fontSize: 10, color: '#aaa', fontWeight: '700', textTransform: 'uppercase' },
  headline: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1a1a2e',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  vibe: {
    fontSize: 11,
    fontWeight: '800',
    color: '#aaa',
    letterSpacing: 2,
    marginBottom: 18,
    textTransform: 'uppercase',
  },
  body: {
    fontSize: 15,
    color: '#555',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 20,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 13,
    paddingHorizontal: 16,
    marginBottom: 28,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  footerRow: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  keepBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  keepBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  dismissBtn: { paddingVertical: 6 },
  dismissBtnText: { color: '#bbb', fontWeight: '600', fontSize: 14 },
  reviewIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  reviewGrid: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginBottom: 14,
  },
  reviewStat: {
    flex: 1,
    backgroundColor: '#f8f8ff',
    borderWidth: 1,
    borderColor: '#eeeeff',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  reviewStatValue: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 3,
  },
  reviewStatLabel: {
    fontSize: 10,
    color: '#888',
    fontWeight: '800',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  reviewCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  reviewCardTitle: {
    fontSize: 13,
    color: '#1a1a2e',
    fontWeight: '900',
    marginBottom: 10,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: '#f2f2f7',
  },
  reviewRowText: {
    color: '#555',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  reviewRowCount: {
    fontSize: 14,
    fontWeight: '900',
  },
  reviewEmpty: {
    color: '#888',
    fontSize: 13,
    lineHeight: 20,
  },
});

// ─── Main Modal ───────────────────────────────────────────────────────────────

const GoalCompletionModal = ({
  visible,
  onClose,
  goalVibe,
  goalProgress,
  goalCount,
  totalLogs,
  moodHistory = [],
  onSaveInsight,
  goalFailed = false,
  weeklyMoodCounts = {},
  weeklyBreakdown = [],
}) => {
  const isComplete = goalProgress >= COMPLETION_THRESHOLD;
  const isFailed = goalFailed && !isComplete;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.88)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      backdropOpacity.setValue(0);
      cardScale.setValue(0.88);
      cardOpacity.setValue(0);

      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(cardScale, { toValue: 1, tension: 52, friction: 8, delay: 80, useNativeDriver: true }),
        Animated.timing(cardOpacity, { toValue: 1, duration: 250, delay: 80, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(cardScale, { toValue: 0.92, duration: 200, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  if (!goalVibe) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent>
      <Animated.View style={[mainStyles.backdrop, { opacity: backdropOpacity }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleClose}
        />
        <Animated.View
          style={[
            mainStyles.card,
            {
              opacity: cardOpacity,
              transform: [{ scale: cardScale }],
              borderTopColor: getMeta(goalVibe).color,
            },
          ]}>
          {/* Header strip */}
          <View
            style={[
              mainStyles.strip,
              {
                backgroundColor: isFailed
                  ? '#f39c12'
                  : getMeta(goalVibe).color + (isComplete ? 'FF' : '55'),
              },
            ]}>
            <Text style={mainStyles.stripText}>
              {isComplete
                ? '🏆 Goal Achieved'
                : isFailed
                ? 'Fresh Start'
                : '💪 Keep Going'}
            </Text>
            <TouchableOpacity onPress={handleClose} style={mainStyles.stripClose}>
              <Icon name="close" size={20} color={isComplete || isFailed ? '#fff' : '#555'} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}>
            {isComplete ? (
              <CompleteContent
                goalVibe={goalVibe}
                goalCount={goalCount}
                totalLogs={totalLogs}
                goalProgress={goalProgress}
                moodHistory={moodHistory}
                onSaveInsight={onSaveInsight}
                onClose={handleClose}
              />
            ) : (
              <IncompleteContent
                goalVibe={goalVibe}
                goalCount={goalCount}
                totalLogs={totalLogs}
                goalProgress={goalProgress}
                goalFailed={isFailed}
                weeklyMoodCounts={weeklyMoodCounts}
                weeklyBreakdown={weeklyBreakdown}
                onClose={handleClose}
              />
            )}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const mainStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,8,30,0.6)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    paddingHorizontal: 12,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 26,
    overflow: 'hidden',
    elevation: 24,
    shadowColor: '#1a1a2e',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    maxHeight: '88%',
    borderTopWidth: 4,
  },
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  stripText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.2,
  },
  stripClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export { COMPLETION_THRESHOLD };
export default GoalCompletionModal;
