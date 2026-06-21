import React, { useMemo, useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// ─── Vibe metadata (mirrors backend VIBE_META) ────────────────────────────────

const VIBE_META = {
  calm: {color: '#A8E6CF', emoji: '😌', quote: 'Find your inner peace.'},
  peaceful: {color: '#B2E2F2', emoji: '🕊️', quote: 'Embrace tranquility.'},
  serene: {
    color: '#D4F1F4',
    emoji: '🧘',
    quote: 'A calm mind brings inner strength.',
  },
  minimalist:  { color: '#D0D0D0', emoji: '⚪' },
  happy: {color: '#FFDE7D', emoji: '😊', quote: 'Choose joy every day.'},
  energetic: {
    color: '#FFD93D',
    emoji: '⚡',
    quote: 'Spark your day with energy.',
  },
  playful: {
    color: '#FF8B94',
    emoji: '🎈',
    quote: 'Life is better when you are laughing.',
  },
  vibrant: {
    color: '#6BCB77',
    emoji: '🌈',
    quote: 'Shine bright and live colorfully.',
  },
  sad:         { color: '#A2D2FF', emoji: '😢' },
  lonely:      { color: '#6C757D', emoji: '👤' },
  pensive:     { color: '#4A4E69', emoji: '🤔' },
  gloomy:      { color: '#9A8C98', emoji: '☁️' },
  anxious:     { color: '#D4A5A5', emoji: '😰' },
  chaotic:     { color: '#E94560', emoji: '🌀' },
  intense:     { color: '#FF4D4D', emoji: '🔥' },
  gritty:      { color: '#545B64', emoji: '⛓️' },
  nostalgic:   { color: '#FFAAA5', emoji: '📺' },
  romantic: {color: '#FFB7B2', emoji: '❤️', quote: 'Love is in the air.'},
  mystical:    { color: '#9D4EDD', emoji: '✨' },
  vintage:     { color: '#B08968', emoji: '🎞️' },
  cozy: {color: '#E6A15C', emoji: '🕯️', quote: 'Snuggle up and feel content.'},
  ethereal: {
    color: '#B8C0FF',
    emoji: '🌫️',
    quote: 'Dream beyond the ordinary.',
  },
  melancholic: { color: '#4E6E81', emoji: '🥀' },
  industrial:  { color: '#545B64', emoji: '⚙️' },
  natural: {color: '#4A7C59', emoji: '🌲', quote: 'Connect with the earth.'},
  futuristic:  { color: '#00F5D4', emoji: '🤖' },
  bold: {color: '#F15BB5', emoji: '🏎️', quote: 'Be brave, be bold.'},
  solitary:    { color: '#8D99AE', emoji: '🏔️' },
  tense:       { color: '#D90429', emoji: '⚠️' },
  hopeful: {
    color: '#FEE440',
    emoji: '🌅',
    quote: 'Hope is the last thing ever lost.',
  },
};

// ─── Time-of-day suggestion slots ─────────────────────────────────────────────

const TIME_SLOTS = [
  {
    id: 'early_morning',
    range: [5, 8],
    label: 'Early Morning',
    icon: 'weather-sunset-up',
    accent: '#FFD93D',
    headline: 'Start with intention',
    description: 'The day is fresh — how do you want to feel?',
    vibes: ['hopeful', 'calm', 'energetic', 'serene', 'peaceful'], // All positive
  },
  {
    id: 'morning',
    range: [8, 12],
    label: 'Morning',
    icon: 'white-balance-sunny',
    accent: '#FFB347',
    headline: 'Morning momentum',
    description: 'Great time to harness positive energy.',
    vibes: ['energetic', 'happy', 'vibrant', 'bold', 'playful'], // All positive
  },
  {
    id: 'afternoon',
    range: [12, 17],
    label: 'Afternoon',
    icon: 'weather-partly-cloudy',
    accent: '#74B9FF',
    headline: 'Midday check-in',
    description: 'Ground yourself through the busiest part of the day.',
    vibes: ['calm', 'natural', 'hopeful', 'minimalist', 'cozy'], // Positive and neutral
  },
  {
    id: 'evening',
    range: [17, 21],
    label: 'Evening',
    icon: 'weather-sunset',
    accent: '#FD79A8',
    headline: 'Wind down rituals',
    description: 'Reflect and let the day soften.',
    vibes: ['nostalgic', 'romantic', 'cozy', 'peaceful', 'ethereal'], // Positive and neutral
  },
  {
    id: 'night',
    range: [21, 29], // wraps past midnight (24+5)
    label: 'Late Night',
    icon: 'weather-night',
    accent: '#A29BFE',
    headline: 'Quiet hours',
    description: 'Late night moods carry a different weight.',
    vibes: ['serene', 'peaceful', 'calm', 'ethereal', 'cozy'], // All positive
  },
];

const getCurrentSlot = () => {
  const hour = new Date().getHours();
  // treat 0–4 as "late night" (hour + 24 for range check)
  const adjustedHour = hour < 5 ? hour + 24 : hour;
  return (
    TIME_SLOTS.find(
      slot => adjustedHour >= slot.range[0] && adjustedHour < slot.range[1],
    ) || TIME_SLOTS[0]
  );
};

// ─── VibeChip ─────────────────────────────────────────────────────────────────

const VibeChip = ({
  vibe,
  isGoal,
  isSelected,
  onPress,
  onLongPress,
  delay = 0,
}) => {
  const meta = VIBE_META[vibe] || { color: '#6c5ce7', emoji: '🌈' };
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Pulse animation for goal chip
  useEffect(() => {
    if (!isGoal) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.06,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [isGoal]);

  return (
    <Animated.View
      style={{
        opacity: opacityAnim,
        transform: [{ scale: scaleAnim }],
      }}>
      <TouchableOpacity
        onLongPress={() => onLongPress?.(vibe)}
        onPress={() => onPress(vibe)}
        activeOpacity={0.75}
        style={[
          chipStyles.chip,
          {
            backgroundColor: meta.color + '22',
            borderColor: meta.color,
            borderWidth: isGoal ? 2 : 1,
          },
          isSelected && {
            backgroundColor: meta.color,
            borderColor: meta.color,
          },
          isGoal && chipStyles.goalChip,
        ]}>
        <Animated.View
          style={[
            chipStyles.inner,
            isGoal && { transform: [{ scale: pulseAnim }] },
          ]}>
          <Text style={chipStyles.emoji}>{meta.emoji}</Text>
          <Text
            style={[
              chipStyles.label,
              { color: isSelected ? '#fff' : '#2d3436' },
            ]}>
            {vibe}
          </Text>
          {isGoal && (
            <View style={[chipStyles.goalBadge, { backgroundColor: meta.color }]}>
              <Icon name="star" size={9} color="#fff" />
            </View>
          )}
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const chipStyles = StyleSheet.create({
  chip: {
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 13,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  goalChip: {
    elevation: 4,
    shadowColor: '#6c5ce7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  emoji: { fontSize: 15 },
  label: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'capitalize',
    color: '#2d3436',
  },
  goalBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 2,
  },
});

// ─── VibeSuggestions (main export) ────────────────────────────────────────────

/**
 * Props:
 *  - moodGoal        { vibe: string | null }   — current goal from backend
 *  - onSelectVibe    (vibe: string) => void     — called when user taps a chip
 *                                                 (pre-fills the text input)
 *  - onUpdateGoal    (vibe: string) => void     — called when user long-presses to set goal
 *  - appBgColor      string                     — for theme contrast
 *  - style           ViewStyle (optional)
 */
const VibeSuggestions = ({
  moodGoal,
  onSelectVibe,
  onUpdateGoal,
  appBgColor = '#f5f5f5',
  style,
}) => {
  const slot = useMemo(() => getCurrentSlot(), []);
  const goalVibes = (
    Array.isArray(moodGoal?.vibes) && moodGoal.vibes.length > 0
      ? moodGoal.vibes
      : moodGoal?.vibe
      ? [moodGoal.vibe]
      : []
  )
    .map(vibe => vibe?.toLowerCase())
    .filter(Boolean)
    .slice(0, 3);

  // Merge goal vibe into suggestions (always show goal first if not already present)
  const suggestions = useMemo(() => {
    const base = [...slot.vibes];
    const filtered = base.filter(vibe => !goalVibes.includes(vibe));
    return [...goalVibes, ...filtered];
  }, [slot.vibes, goalVibes]);

  const [selectedVibe, setSelectedVibe] = useState(null);
  const [goalToast, setGoalToast] = useState('');
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastAnimationRef = useRef(null);

  // Card entrance
  const cardSlide = useRef(new Animated.Value(20)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.parallel([
      Animated.spring(cardSlide, {
        toValue: 0,
        tension: 50,
        friction: 9,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [cardOpacity, cardSlide]);

  useEffect(() => {
    return () => {
      toastAnimationRef.current?.stop();
    };
  }, []);

  const showToast = msg => {
    setGoalToast(msg);
    toastAnimationRef.current?.stop();
    toastAnim.setValue(0);
    toastAnimationRef.current = Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]);
    toastAnimationRef.current.start(({finished}) => {
      if (finished) {
        setGoalToast('');
      }
    });
  };

  const handleChipPress = vibe => {
    setSelectedVibe(prev => (prev === vibe ? null : vibe));
    onSelectVibe?.(vibe);
    const meta = VIBE_META[vibe];
    if (meta?.quote) showToast(meta.quote);
  };

  const handleChipLongPress = vibe => {
    if (!onUpdateGoal) return;
    const nextGoals = goalVibes.includes(vibe)
      ? goalVibes.filter(goal => goal !== vibe)
      : goalVibes.length >= 3
      ? null
      : [...goalVibes, vibe];
    if (!nextGoals || nextGoals.length === 0) return;
    onUpdateGoal(nextGoals);
    const toastMessage = nextGoals.includes(vibe)
      ? `🎯 Added "${vibe}" to goals`
      : `Removed "${vibe}" from goals`;
    showToast(toastMessage);
  };

  // Is the goal vibe in today's suggestions?
  const alignedGoals = goalVibes.filter(vibe => suggestions.includes(vibe));
  const goalAligned = alignedGoals.length > 0;

  return (
    <Animated.View
      style={[
        styles.card,
        style,
        {
          opacity: cardOpacity,
          transform: [{ translateY: cardSlide }],
        },
      ]}>
      {/* Header row */}
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: slot.accent + '22' }]}>
          <Icon name={slot.icon} size={20} color={slot.accent} />
        </View>

        <View style={styles.headerText}>
          <Text style={styles.headline}>{slot.headline}</Text>
          <Text style={styles.subtext}>{slot.description}</Text>
        </View>

        <View style={[styles.timeBadge, { backgroundColor: slot.accent + '18' }]}>
          <Text style={[styles.timeBadgeText, { color: slot.accent }]}>
            {slot.label}
          </Text>
        </View>
      </View>

      {/* Goal alignment notice */}
      {goalAligned && (
        <View style={styles.goalBanner}>
          <Icon name="star-circle" size={15} color="#6c5ce7" />
          <Text style={styles.goalBannerText}>
            Your goal vibe{' '}
            <Text style={styles.goalBannerBold}>
              {alignedGoals
                .map(vibe => `${VIBE_META[vibe]?.emoji} ${vibe}`)
                .join(', ')}
            </Text>{' '}
            fits this time of day ✨
          </Text>
        </View>
      )}

      {/* Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsScroll}>
        {suggestions.map((vibe, i) => (
          <VibeChip
            key={vibe}
            vibe={vibe}
            isGoal={goalVibes.includes(vibe)}
            isSelected={selectedVibe === vibe}
            onPress={handleChipPress}
            onLongPress={handleChipLongPress}
            delay={i * 55}
          />
        ))}
      </ScrollView>

      {/* Hint */}
      <View style={styles.hintRow}>
        <Icon name="gesture-tap" size={13} color="#bbb" />
        <Text style={styles.hint}>Tap to pre-fill · Hold to set as goal</Text>
      </View>

      {/* Toast */}
      {!!goalToast && (
        <Animated.View
          style={[
            styles.toast,
            {
              opacity: toastAnim,
              transform: [
                {
                  translateY: toastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [8, 0],
                  }),
                },
              ],
            },
          ]}>
          <Text style={styles.toastText}>{goalToast}</Text>
        </Animated.View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#eee',
    elevation: 4,
    shadowColor: '#6c5ce7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: { flex: 1 },
  headline: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2d3436',
    letterSpacing: -0.2,
  },
  subtext: {
    fontSize: 12,
    color: '#888',
    marginTop: 1,
    lineHeight: 16,
  },
  timeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  timeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  goalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#f0eeff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  goalBannerText: {
    fontSize: 12,
    color: '#555',
    flex: 1,
    lineHeight: 18,
  },
  goalBannerBold: {
    fontWeight: '800',
    color: '#6c5ce7',
    textTransform: 'capitalize',
  },
  chipsScroll: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    paddingBottom: 4,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  hint: {
    fontSize: 11,
    color: '#ccc',
    fontWeight: '600',
  },
  toast: {
    position: 'absolute',
    bottom: 14,
    alignSelf: 'center',
    backgroundColor: '#2d3436',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  toastText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});

export default VibeSuggestions;
