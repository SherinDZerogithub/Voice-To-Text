import React, {useEffect, useRef} from 'react';
import {Animated, StyleSheet, Text, View} from 'react-native';

// Mood Twin is intentionally display-only. The home page analyzer is the
// single source of truth for the current mood and its visual theme.
const MOOD_THEMES = {
  happy: {
    label: 'Happy',
    emoji: '😊',
    accent: '#E5A900',
    background: '#FFF9E6',
    surface: '#FFFDF5',
    message: 'Let that good energy stay with you.',
  },
  sad: {
    label: 'Sad',
    emoji: '💙',
    accent: '#5D8FB8',
    background: '#EEF6FC',
    surface: '#F9FCFF',
    message: 'You do not have to carry this feeling alone.',
  },
  calm: {
    label: 'Calm',
    emoji: '🧘',
    accent: '#429B58',
    background: '#EFFAF1',
    surface: '#FAFFFB',
    message: 'There is room to enjoy this quiet moment.',
  },
  anxious: {
    label: 'Anxious',
    emoji: '🫂',
    accent: '#D96D4D',
    background: '#FFF3EE',
    surface: '#FFFBF9',
    message: 'Take this one small moment at a time.',
  },
  hopeful: {
    label: 'Hopeful',
    emoji: '🌟',
    accent: '#D99A00',
    background: '#FFFBE8',
    surface: '#FFFDF5',
    message: 'Keep following the little sparks of possibility.',
  },
  tired: {
    label: 'Tired',
    emoji: '😴',
    accent: '#9A704A',
    background: '#FBF4EC',
    surface: '#FFFCF8',
    message: 'Rest is a valid and important kind of progress.',
  },
  angry: {
    label: 'Angry',
    emoji: '💢',
    accent: '#D64B55',
    background: '#FFF0F1',
    surface: '#FFFAFA',
    message: 'Your feeling is real. Give yourself space before reacting.',
  },
  neutral: {
    label: 'Neutral',
    emoji: '👋',
    accent: '#6C5CE7',
    background: '#F7F5FF',
    surface: '#FCFBFF',
    message: 'Every honest check-in is worth something.',
  },
};

const MOOD_ALIASES = {
  happy: ['happy', 'joy', 'joyful', 'good', 'great', 'excited', 'grateful', 'content'],
  sad: ['sad', 'down', 'depressed', 'unhappy', 'blue', 'lonely', 'gloomy', 'heartbroken'],
  calm: ['calm', 'peaceful', 'relaxed', 'serene', 'tranquil', 'still', 'fine', 'okay'],
  anxious: ['anxious', 'worried', 'nervous', 'stressed', 'tense', 'afraid', 'panic', 'overwhelmed'],
  hopeful: ['hopeful', 'optimistic', 'inspired', 'motivated', 'positive'],
  tired: ['tired', 'exhausted', 'drained', 'sleepy', 'fatigued', 'burnout', 'worn'],
  angry: ['angry', 'frustrated', 'annoyed', 'upset', 'mad', 'furious', 'irritated'],
};

const resolveMoodKey = moodData => {
  const value = `${moodData?.vibe || moodData?.mood || ''}`.toLowerCase();
  const match = Object.entries(MOOD_ALIASES).find(([, aliases]) =>
    aliases.some(alias => value.includes(alias)),
  );
  return match ? match[0] : 'neutral';
};

export const getMoodTheme = moodData => {
  const key = resolveMoodKey(moodData);
  return {key, ...MOOD_THEMES[key]};
};

const MoodTwin = ({moodData}) => {
  const theme = getMoodTheme(moodData);
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    scale.setValue(0.92);
    Animated.spring(scale, {
      toValue: 1,
      friction: 7,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [scale, theme.key]);

  if (!moodData) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.card,
        {backgroundColor: theme.surface, borderColor: `${theme.accent}35`},
        {transform: [{scale}]},
      ]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, {backgroundColor: `${theme.accent}18`}]}>
          <Text style={styles.emoji}>{theme.emoji}</Text>
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.kicker}>Mood Twin</Text>
          <Text style={[styles.title, {color: theme.accent}]}>
            Reflecting your {theme.label.toLowerCase()} mood
          </Text>
        </View>
        <View style={[styles.moodPill, {backgroundColor: theme.accent}]}>
          <Text style={styles.moodPillText}>{theme.label}</Text>
        </View>
      </View>
      <Text style={styles.message}>{theme.message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginVertical: 10,
    elevation: 2,
    shadowColor: '#1a1a2e',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  header: {flexDirection: 'row', alignItems: 'center', gap: 10},
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {fontSize: 22},
  headerCopy: {flex: 1},
  kicker: {
    color: '#8A8A98',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {fontSize: 14, fontWeight: '800', marginTop: 3},
  moodPill: {paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14},
  moodPillText: {color: '#fff', fontSize: 11, fontWeight: '800'},
  message: {color: '#5E606B', fontSize: 13, lineHeight: 19, marginTop: 13},
});

export default MoodTwin;
