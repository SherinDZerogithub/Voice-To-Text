import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCENT = '#10b981';
const getGoalVibes = moodGoal =>
  (Array.isArray(moodGoal?.vibes) && moodGoal.vibes.length > 0
    ? moodGoal.vibes
    : moodGoal?.vibe
    ? [moodGoal.vibe]
    : []
  )
    .map(vibe => vibe?.toLowerCase())
    .filter(Boolean)
    .slice(0, 3);

const isWriteAction = text => {
  const t = text.toLowerCase();
  return t.includes('write') || t.includes('note') || t.includes('journal') || t.includes('record') || t.includes('reflect');
};

const HabitRecommendations = ({token, backendUrl, moodHistory, moodGoal, onAction}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(new Set());
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Load completions for today's habits
  useEffect(() => {
    const load = async () => {
      try {
        const today = new Date().toDateString();
        const stored = await AsyncStorage.getItem(`habit_check_${today}`);
        if (stored) {
          setCompleted(new Set(JSON.parse(stored)));
        }
      } catch (e) { console.warn(e); }
    };
    load();
  }, [data]); // Re-sync when new habits are loaded

  const fetchHabits = useCallback(async () => {
    if (!token || !backendUrl || !moodHistory || moodHistory.length < 3) return;
    
    setLoading(true);
    try {
      const recentVibes = moodHistory.slice(0, 10).map(m => m.vibe);
      const goalVibes = getGoalVibes(moodGoal);
      const res = await fetch(`${backendUrl}/habit-recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recent_vibes: recentVibes,
          mood_goal: goalVibes.length > 0 ? goalVibes.join(', ') : null,
        }),
      });
      
      if (!res.ok) return;
      const json = await res.json();
      setData(json);
      Animated.timing(fadeAnim, {toValue: 1, duration: 400, useNativeDriver: true}).start();
    } catch (e) {
      console.warn('[HabitRecommendations]', e);
    } finally {
      setLoading(false);
    }
  }, [token, backendUrl, moodHistory, moodGoal, fadeAnim]);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  const handleHabitPress = async (habit) => {
    const next = new Set(completed);
    const isDone = next.has(habit);
    
    if (isDone) {
      next.delete(habit);
    } else {
      next.add(habit);
      // If it's a writing action, trigger the app response
      if (isWriteAction(habit) && onAction) {
        onAction(habit);
      }
    }
    setCompleted(next);
    const today = new Date().toDateString();
    await AsyncStorage.setItem(`habit_check_${today}`, JSON.stringify([...next]));
  };

  if (loading) {
    return (
      <View style={styles.loadingCard}>
        <ActivityIndicator size="small" color={ACCENT} />
        <Text style={styles.loadingText}>Building habit suggestions…</Text>
      </View>
    );
  }

  if (!data || data.source === 'no_data' || !data.habits || data.habits.length === 0) return null;
  const goalVibes = getGoalVibes(moodGoal);

  return (
    <Animated.View style={[styles.card, {opacity: fadeAnim}]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, {backgroundColor: ACCENT + '15'}]}>
          <Icon name="checkbox-marked-circle-outline" size={18} color={ACCENT} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Tiny Habits for You</Text>
          <Text style={styles.subtitle}>
            {data.source === 'ai' ? '✦ Personalized for your mood pattern' : 'Evidence-based wellness practices'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={fetchHabits}
          activeOpacity={0.7}>
          <Icon name="refresh" size={14} color="#9ca3af" />
        </TouchableOpacity>
      </View>

      <View style={styles.habitList}>
        {data?.habits?.map((habit, i) => {
          const isDone = completed.has(habit);
          return (
            <TouchableOpacity 
              key={i} 
              style={styles.habitItem} 
              onPress={() => handleHabitPress(habit)}
              activeOpacity={0.7}>
              <View style={[styles.habitNumber, {backgroundColor: isDone ? ACCENT : ACCENT + '18'}]}>
                {isDone ? (
                  <Icon name="check" size={14} color="#fff" />
                ) : (
                  <Text style={[styles.habitNumberText, {color: ACCENT}]}>{i + 1}</Text>
                )}
              </View>
              <Text style={[styles.habitText, isDone && styles.habitTextDone]}>{habit}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {goalVibes.length > 0 && (
        <View style={styles.goalTag}>
          <Icon name="target" size={11} color="#9ca3af" />
          <Text style={styles.goalTagText}>
            Aligned with your {goalVibes.join(', ')} goals
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#ede9fe',
  },
  loadingText: {fontSize: 13, color: '#9ca3af', fontWeight: '500'},
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: ACCENT,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    width: '100%',
    alignSelf: 'stretch',
  },
  header: {flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14},
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {flex: 1},
  title: {fontSize: 14, fontWeight: '800', color: '#1a1a2e'},
  subtitle: {fontSize: 11, color: '#9ca3af', fontWeight: '500', marginTop: 1},
  refreshBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitList: {gap: 10},
  habitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  habitNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  habitNumberText: {fontSize: 12, fontWeight: '800'},
  habitText: {
    flex: 1,
    fontSize: 13,
    color: '#2d3436',
    lineHeight: 20,
    fontWeight: '500',
  },
  goalTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    justifyContent: 'flex-end',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  goalTagText: {fontSize: 10, color: '#9ca3af', fontWeight: '600'},
});

export default HabitRecommendations;
