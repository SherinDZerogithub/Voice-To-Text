/**
 * MoodCompanion.jsx
 *
 * A contextual mood companion card on the home dashboard.
 * Asks questions that adapt over time based on:
 *  - Time of day
 *  - Recent mood patterns from history
 *  - Recurring vibes
 *  - Days since last check-in
 *  - Emotional trends (improving / declining)
 *
 * Also calls the backend /companion-question endpoint for AI-generated questions
 * when available, falling back gracefully to static contextual questions.
 *
 * Props:
 *  moodHistory      array    — formatted mood log items
 *  userName         string
 *  token            string
 *  backendUrl       string
 *  onQuestionSelect (question: string) => void  — pre-fills the text input
 *  appBgColor       string
 */

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// ─── Static contextual question banks ────────────────────────────────────────

const TIME_QUESTIONS = {
  earlyMorning: [
    'How did you sleep last night?',
    'What intention are you setting for today?',
    'What are you looking forward to this morning?',
  ],
  morning: [
    'How are you starting your day?',
    'What\'s the first thing on your mind today?',
    'Is there anything you\'re carrying from yesterday?',
  ],
  afternoon: [
    'How\'s your energy holding up today?',
    'What has surprised you so far today?',
    'Are you getting what you needed from this day?',
  ],
  evening: [
    'How are you winding down tonight?',
    'What moment from today stands out to you?',
    'What do you want to let go of before bed?',
  ],
  night: [
    'What\'s keeping you up tonight?',
    'What are you sitting with right now?',
    'How does silence feel for you at this hour?',
  ],
};

const STREAK_QUESTIONS = {
  new: [
    'What brought you to check in today?',
    'What does it feel like to start tracking your mood?',
  ],
  early: [
    'What patterns are you starting to notice in yourself?',
    'Is there a feeling that keeps showing up for you lately?',
  ],
  established: [
    'Looking back at your recent entries — what surprises you?',
    'Your consistency here reflects something. What is it?',
  ],
  long: [
    'You\'ve shown up for yourself consistently. What keeps you going?',
    'After all these check-ins, what has changed in how you understand yourself?',
  ],
};

const PATTERN_QUESTIONS = {
  repeating_positive: vibe => [
    `You've been feeling ${vibe} a lot lately — what's been sustaining that?`,
    `When you feel ${vibe}, what does your life look like around you?`,
  ],
  repeating_negative: vibe => [
    `You've been experiencing ${vibe} feelings frequently. What might be underneath that?`,
    `When you feel ${vibe}, what do you most need from yourself?`,
    `Is there something you've been avoiding that might be connected to feeling ${vibe}?`,
  ],
  improving: [
    'Your mood has been shifting in a lighter direction — what\'s contributing to that?',
    'Something seems to be getting easier lately. What has changed?',
  ],
  declining: [
    'Things seem heavier lately. What\'s been weighing on you?',
    'What would it look like to give yourself some extra care today?',
    'Is there someone you trust that you could talk to about how you\'ve been feeling?',
  ],
  variety: [
    'Your emotions have been really diverse lately. What does that feel like?',
    'You seem to be moving through a lot of different states. How are you keeping up with yourself?',
  ],
};

const RETURN_QUESTIONS = days => {
  if (days <= 1) return ['How are you feeling right now, in this moment?'];
  if (days <= 4) return [
    `You stepped away for a few days — what was that like?`,
    "What's been happening that brought you back today?",
  ];
  return [
    `It\'s been ${days} days. A lot can change. How are you, really?`,
    'What do you most want to acknowledge about this past stretch?',
  ];
};

// ─── Trend detection ──────────────────────────────────────────────────────────

const VIBE_VALENCE = {
  happy: 1, energetic: 1, playful: 1, vibrant: 1, calm: 1, peaceful: 1,
  serene: 1, hopeful: 1, cozy: 1, natural: 1, romantic: 1, ethereal: 0.5,
  nostalgic: 0, minimalist: 0, pensive: -0.5, vintage: 0, bold: 0.5,
  futuristic: 0, sad: -1, lonely: -1, gloomy: -1, anxious: -1,
  chaotic: -1, intense: -0.75, gritty: -0.5, tense: -1, melancholic: -0.75,
  solitary: -0.5, industrial: -0.25,
};

const detectTrend = (recent5) => {
  if (recent5.length < 3) return 'neutral';
  const scores = recent5.map(e => VIBE_VALENCE[e.vibe?.toLowerCase()] ?? 0);
  let improvements = 0;
  let declines = 0;
  for (let i = 0; i < scores.length - 1; i++) {
    if (scores[i] > scores[i + 1]) improvements++;
    else if (scores[i] < scores[i + 1]) declines++;
  }
  if (improvements >= 3) return 'improving';
  if (declines >= 3) return 'declining';
  return 'neutral';
};

const getMostRepeatedVibe = (recent) => {
  const counts = {};
  recent.forEach(e => {
    if (e.vibe) counts[e.vibe] = (counts[e.vibe] || 0) + 1;
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (!sorted.length) return null;
  const [vibe, count] = sorted[0];
  return count >= 2 ? vibe : null;
};

// ─── Context builder ──────────────────────────────────────────────────────────

const buildContext = (moodHistory, userName) => {
  const now = new Date();
  const hour = now.getHours();

  let timeSlot;
  if (hour >= 5 && hour < 8) timeSlot = 'earlyMorning';
  else if (hour >= 8 && hour < 12) timeSlot = 'morning';
  else if (hour >= 12 && hour < 17) timeSlot = 'afternoon';
  else if (hour >= 17 && hour < 21) timeSlot = 'evening';
  else timeSlot = 'night';

  const sorted = [...(moodHistory || [])].sort((a, b) => {
    const da = a.rawTimestamp ? new Date(a.rawTimestamp) : 0;
    const db = b.rawTimestamp ? new Date(b.rawTimestamp) : 0;
    return db - da;
  });

  const latest = sorted[0];
  let daysAway = 0;
  if (latest?.rawTimestamp) {
    const ms = now - new Date(latest.rawTimestamp);
    daysAway = Math.floor(ms / 86400000);
  }

  const recent5 = sorted.slice(0, 5);
  const totalLogs = sorted.length;
  const trend = detectTrend(recent5);
  const repeatedVibe = getMostRepeatedVibe(recent5);

  // Streak category
  let streakCategory = 'new';
  const daySet = new Set(
    sorted.map(e => e.rawTimestamp ? new Date(e.rawTimestamp).toDateString() : null).filter(Boolean)
  );
  const uniqueDays = daySet.size;
  if (uniqueDays >= 14) streakCategory = 'long';
  else if (uniqueDays >= 7) streakCategory = 'established';
  else if (uniqueDays >= 3) streakCategory = 'early';

  return {timeSlot, daysAway, trend, repeatedVibe, streakCategory, totalLogs, recent5};
};

const pickQuestion = (ctx) => {
  const {timeSlot, daysAway, trend, repeatedVibe, streakCategory, totalLogs} = ctx;
  const candidates = [];

  // If returning after a break, prioritise return questions
  if (daysAway >= 1) {
    candidates.push(...RETURN_QUESTIONS(daysAway));
  }

  // Trend-based
  if (trend === 'improving') candidates.push(...PATTERN_QUESTIONS.improving);
  if (trend === 'declining') candidates.push(...PATTERN_QUESTIONS.declining);

  // Repeated vibe
  if (repeatedVibe) {
    const val = VIBE_VALENCE[repeatedVibe] ?? 0;
    if (val > 0.5) candidates.push(...PATTERN_QUESTIONS.repeating_positive(repeatedVibe));
    else if (val < -0.5) candidates.push(...PATTERN_QUESTIONS.repeating_negative(repeatedVibe));
  }

  // Streak context (for established users)
  if (totalLogs >= 3) candidates.push(...(STREAK_QUESTIONS[streakCategory] || []));

  // Time-of-day fallback
  candidates.push(...(TIME_QUESTIONS[timeSlot] || TIME_QUESTIONS.morning));

  // Pick non-repeating question (rotate by index based on day)
  const dayIndex = new Date().getDate();
  return candidates[dayIndex % candidates.length] || candidates[0];
};

// ─── Companion persona ────────────────────────────────────────────────────────

const getCompanionGreeting = (ctx, userName) => {
  const name = userName ? userName.split(' ')[0] : null;
  const {trend, daysAway, streakCategory} = ctx;

  if (daysAway >= 7) return {
    icon: 'star-outline',
    color: '#B8C0FF',
    prefix: name ? `${name}, I\'ve been thinking about you.` : 'I\'ve been thinking about you.',
  };
  if (daysAway >= 2) return {
    icon: 'hand-wave',
    color: '#A8E6CF',
    prefix: name ? `Welcome back, ${name}.` : 'Welcome back.',
  };
  if (trend === 'declining') return {
    icon: 'heart-outline',
    color: '#FFB7B2',
    prefix: 'I\'m here. You don\'t have to be okay.',
  };
  if (trend === 'improving') return {
    icon: 'emoticon-happy-outline',
    color: '#FFD93D',
    prefix: name ? `Something's shifting for you, ${name}.` : 'Something is shifting for you.',
  };
  if (streakCategory === 'long') return {
    icon: 'fire',
    color: '#FF6B35',
    prefix: 'You keep showing up. That means something.',
  };

  const defaults = [
    {icon: 'chat-outline', color: '#A2D2FF', prefix: 'A moment for you.'},
    {icon: 'leaf', color: '#A8E6CF', prefix: 'Check in with yourself.'},
    {icon: 'weather-cloudy', color: '#9A8C98', prefix: 'How are you, honestly?'},
    {icon: 'lightbulb-on-outline', color: '#FEE440', prefix: 'Something to reflect on.'},
  ];
  return defaults[new Date().getDate() % defaults.length];
};

// ─── Main Component ───────────────────────────────────────────────────────────

const MoodCompanion = ({
  moodHistory,
  userName,
  token,
  backendUrl,
  onQuestionSelect,
  appBgColor,
}) => {
  const [aiQuestion, setAiQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tapped, setTapped] = useState(false);

  const cardSlide = useRef(new Animated.Value(16)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const questionScale = useRef(new Animated.Value(1)).current;

  const ctx = useMemo(() => buildContext(moodHistory, userName), [moodHistory, userName]);
  const staticQuestion = useMemo(() => pickQuestion(ctx), [ctx]);
  const greeting = useMemo(() => getCompanionGreeting(ctx, userName), [ctx, userName]);

  const displayQuestion = aiQuestion || staticQuestion;

  // Card entrance
  useEffect(() => {
    Animated.parallel([
      Animated.spring(cardSlide, {
        toValue: 0,
        tension: 50,
        friction: 9,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 400,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Fetch AI question when we have a backend + enough history
  useEffect(() => {
    if (!backendUrl || !token || !moodHistory || moodHistory.length < 3) return;

    let cancelled = false;
    const fetch_ = async () => {
      setIsLoading(true);
      try {
        const recentVibes = moodHistory
          .slice(0, 5)
          .map(e => e.vibe)
          .filter(Boolean)
          .join(', ');

        const response = await fetch(`${backendUrl}/companion-question`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            recent_vibes: recentVibes,
            days_away: ctx.daysAway,
            trend: ctx.trend,
            total_logs: ctx.totalLogs,
            time_slot: ctx.timeSlot,
          }),
        });
        if (!response.ok) throw new Error('fetch failed');
        const data = await response.json();
        if (!cancelled && data.question) {
          setAiQuestion(data.question);
        }
      } catch {
        // keep static question silently
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetch_();
    return () => { cancelled = true; };
  }, [backendUrl, token, moodHistory?.length]);

  const handleTap = useCallback(() => {
    if (!displayQuestion) return;

    // Bounce animation
    Animated.sequence([
      Animated.timing(questionScale, {toValue: 0.96, duration: 80, useNativeDriver: true}),
      Animated.spring(questionScale, {toValue: 1, tension: 200, friction: 8, useNativeDriver: true}),
    ]).start();

    setTapped(true);
    onQuestionSelect && onQuestionSelect(displayQuestion);

    setTimeout(() => setTapped(false), 2000);
  }, [displayQuestion, onQuestionSelect]);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          borderColor: greeting.color,
          opacity: cardOpacity,
          transform: [{translateY: cardSlide}],
        },
      ]}>

      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconWrap, {backgroundColor: greeting.color + '25'}]}>
          <Icon name={greeting.icon} size={20} color={greeting.color} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.companionLabel}>Mood Companion</Text>
          <Text style={styles.prefix}>{greeting.prefix}</Text>
        </View>
        {isLoading && (
          <View style={[styles.aiPill, {backgroundColor: greeting.color + '20'}]}>
            <Text style={[styles.aiPillText, {color: greeting.color}]}>thinking…</Text>
          </View>
        )}
        {aiQuestion && !isLoading && (
          <View style={[styles.aiPill, {backgroundColor: greeting.color + '20'}]}>
            <Icon name="creation" size={10} color={greeting.color} />
            <Text style={[styles.aiPillText, {color: greeting.color}]}>personalised</Text>
          </View>
        )}
      </View>

      {/* Question bubble */}
      <TouchableOpacity
        onPress={handleTap}
        activeOpacity={0.85}
        style={[
          styles.questionBubble,
          {borderColor: greeting.color + '40'},
          tapped && {backgroundColor: greeting.color + '15'},
        ]}>
        <Animated.View style={{transform: [{scale: questionScale}]}}>
          <Text style={styles.questionText}>{displayQuestion}</Text>
        </Animated.View>
        <View style={styles.tapHint}>
          <Icon
            name={tapped ? 'check-circle-outline' : 'gesture-tap'}
            size={13}
            color={tapped ? greeting.color : '#ccc'}
          />
          <Text style={[styles.tapHintText, tapped && {color: greeting.color}]}>
            {tapped ? 'Added to your entry' : 'Tap to use as your entry'}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Context insight strip (show only if there's something useful) */}
      {ctx.trend !== 'neutral' && (
        <View style={[styles.trendStrip, {backgroundColor: greeting.color + '12'}]}>
          <Icon
            name={ctx.trend === 'improving' ? 'trending-up' : 'trending-down'}
            size={12}
            color={greeting.color}
          />
          <Text style={[styles.trendText, {color: greeting.color}]}>
            {ctx.trend === 'improving'
              ? 'Your mood has been trending upward lately'
              : 'You\'ve been carrying heavier feelings recently'}
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 18,
    gap: 12,
    elevation: 4,
    shadowColor: '#6c5ce7',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.07,
    shadowRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {flex: 1},
  companionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#bbb',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  prefix: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2d3436',
    marginTop: 1,
  },
  aiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  aiPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  questionBubble: {
    backgroundColor: '#fafafa',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  questionText: {
    fontSize: 16,
    color: '#2d3436',
    lineHeight: 24,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  tapHintText: {
    fontSize: 11,
    color: '#ccc',
    fontWeight: '600',
  },
  trendStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
});

export default MoodCompanion;