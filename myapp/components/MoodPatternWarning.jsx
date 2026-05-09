import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Animated, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// ─── Vibe valence map (positive = 1, neutral = 0, negative = -1) ─────────────

const VIBE_VALENCE = {
  happy: 1,
  energetic: 1,
  playful: 1,
  vibrant: 1,
  calm: 1,
  peaceful: 1,
  serene: 1,
  hopeful: 1,
  cozy: 1,
  natural: 1,
  romantic: 1,
  ethereal: 0.5,
  nostalgic: 0,
  minimalist: 0,
  pensive: -0.5,
  vintage: 0,
  bold: 0.5,
  futuristic: 0,
  sad: -1,
  lonely: -1,
  gloomy: -1,
  anxious: -1,
  chaotic: -1,
  intense: -0.75,
  gritty: -0.5,
  tense: -1,
  melancholic: -0.75,
  solitary: -0.5,
  industrial: -0.25,
};

// ─── Pattern detection configs ────────────────────────────────────────────────

const PATTERNS = [
  {
    id: 'consecutive_negative',
    detect: entries => {
      let streak = 0;
      for (let i = 0; i < entries.length; i++) {
        const v = VIBE_VALENCE[entries[i].vibe?.toLowerCase()] ?? 0;
        if (v <= -0.75) {
          streak++;
        } else {
          break;
        }
      }
      return streak >= 3 ? streak : null;
    },
    getWarning: streak => ({
      icon: 'weather-cloudy',
      color: '#A2D2FF',
      title: `${streak} heavy entries in a row`,
      message:
        "You've been carrying a lot lately. That's valid — and it's worth pausing to check in.",
      suggestion: 'Try a short breathing exercise or a gentle walk.',
      cta: "I'm doing okay",
    }),
  },
  {
    id: 'anxiety_cluster',
    detect: entries => {
      const recent5 = entries.slice(0, 5);
      const anxious = recent5.filter(e =>
        ['anxious', 'tense', 'chaotic', 'intense'].includes(
          e.vibe?.toLowerCase(),
        ),
      );
      return anxious.length >= 3 ? anxious.length : null;
    },
    getWarning: count => ({
      icon: 'heart-pulse',
      color: '#D4A5A5',
      title: `${count} high-tension entries this week`,
      message:
        'Your recent vibes show a lot of tension. Remember to ground yourself.',
      suggestion:
        'Try the 5-4-3-2-1 grounding technique: name 5 things you can see.',
      cta: 'Thanks for the reminder',
    }),
  },
  {
    id: 'declining_trend',
    detect: entries => {
      if (entries.length < 5) {
        return null;
      }
      const recent = entries
        .slice(0, 6)
        .map(e => VIBE_VALENCE[e.vibe?.toLowerCase()] ?? 0);
      // Check if the trend is consistently declining (simple slope)
      let declines = 0;
      for (let i = 0; i < recent.length - 1; i++) {
        if (recent[i] < recent[i + 1]) {
          declines++;
        }
      }
      return declines >= 4 ? declines : null;
    },
    getWarning: () => ({
      icon: 'trending-down',
      color: '#FFAAA5',
      title: 'Your mood has been dipping',
      message:
        "There's a downward pattern in your recent entries. Small shifts can help.",
      suggestion:
        'Even a 10-minute walk or a warm drink can interrupt a spiral.',
      cta: "I'll try that",
    }),
  },
];

// ─── Main Component ───────────────────────────────────────────────────────────

const MoodPatternWarning = ({moodHistory, appBgColor}) => {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const slideAnim = useRef(new Animated.Value(-80)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const expandAnim = useRef(new Animated.Value(0)).current;

  // Detect the first matching pattern from the most recent entries
  const detected = useMemo(() => {
    if (!moodHistory || moodHistory.length < 3) {
      return null;
    }
    // Sort by most recent first (already should be, but make sure)
    const sorted = [...moodHistory].filter(e => e.vibe).slice(0, 10);

    for (const pattern of PATTERNS) {
      const result = pattern.detect(sorted);
      if (result !== null) {
        return pattern.getWarning(result);
      }
    }
    return null;
  }, [moodHistory]);

  useEffect(() => {
    if (detected && !dismissed) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 9,
          delay: 600,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 400,
          delay: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [detected, dismissed, slideAnim, opacityAnim]);

  const handleExpand = () => {
    const toVal = expanded ? 0 : 1;
    setExpanded(!expanded);
    Animated.spring(expandAnim, {
      toValue: toVal,
      tension: 60,
      friction: 10,
      useNativeDriver: false,
    }).start();
  };

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -80,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setDismissed(true));
  };

  if (!detected || dismissed) {
    return null;
  }

  const borderColor = detected.color;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          borderColor,
          opacity: opacityAnim,
          transform: [{translateY: slideAnim}],
        },
      ]}>
      {/* Header row */}
      <TouchableOpacity
        style={styles.headerRow}
        onPress={handleExpand}
        activeOpacity={0.8}>
        <View
          style={[styles.iconWrap, {backgroundColor: detected.color + '30'}]}>
          <Icon name={detected.icon} size={20} color={detected.color} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{detected.title}</Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            {detected.message}
          </Text>
        </View>
        <Icon
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color="#bbb"
        />
      </TouchableOpacity>

      {/* Expanded content */}
      <Animated.View
        style={{
          maxHeight: expandAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 120],
          }),
          overflow: 'hidden',
          opacity: expandAnim,
        }}>
        <View
          style={[styles.suggestionBox, {borderColor: detected.color + '40'}]}>
          <Icon name="lightbulb-outline" size={15} color={detected.color} />
          <Text style={styles.suggestionText}>{detected.suggestion}</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.ctaBtn,
            {
              backgroundColor: detected.color + '20',
              borderColor: detected.color + '40',
            },
          ]}
          onPress={handleDismiss}
          activeOpacity={0.8}>
          <Text style={[styles.ctaBtnText, {color: detected.color}]}>
            {detected.cta}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Close (X) */}
      <TouchableOpacity
        style={styles.closeBtn}
        onPress={handleDismiss}
        hitSlop={{top: 8, right: 8, bottom: 8, left: 8}}>
        <Icon name="close" size={14} color="#ccc" />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.07,
    shadowRadius: 10,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2d3436',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
    lineHeight: 17,
  },
  suggestionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },
  suggestionText: {
    flex: 1,
    fontSize: 13,
    color: '#555',
    lineHeight: 19,
  },
  ctaBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 18,
    alignSelf: 'flex-start',
  },
  ctaBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
  },
});

export default MoodPatternWarning;
