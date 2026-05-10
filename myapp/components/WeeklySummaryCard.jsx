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

const ACCENT = '#7c6ff7';

const Pill = ({text, icon, color}) => (
  <View style={[styles.pill, {backgroundColor: color + '18', borderColor: color + '30'}]}>
    <Icon name={icon} size={11} color={color} />
    <Text style={[styles.pillText, {color}]} numberOfLines={2}>{text}</Text>
  </View>
);

const WeeklySummaryCard = ({token, backendUrl}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  const fetch_ = useCallback(async () => {
    if (!token || !backendUrl) return;
    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/mood-summary/weekly`, {
        headers: {Authorization: `Bearer ${token}`},
      });
      if (!res.ok) return;
      const json = await res.json();
      setData(json);
      Animated.parallel([
        Animated.timing(fadeAnim, {toValue: 1, duration: 400, useNativeDriver: true}),
        Animated.spring(slideAnim, {toValue: 0, tension: 60, friction: 10, useNativeDriver: true}),
      ]).start();
    } catch (e) {
      console.warn('[WeeklySummary]', e);
    } finally {
      setLoading(false);
    }
  }, [token, backendUrl]);

  useEffect(() => {
    fetch_();
  }, [fetch_]);

  if (loading) {
    return (
      <View style={styles.loadingCard}>
        <ActivityIndicator size="small" color={ACCENT} />
        <Text style={styles.loadingText}>Building your weekly summary…</Text>
      </View>
    );
  }

  if (!data || data.source === 'no_data') return null;

  const color = data.color || ACCENT;

  return (
    <Animated.View style={[styles.card, {opacity: fadeAnim, transform: [{translateY: slideAnim}]}]}>
      {/* Accent top bar */}
      <View style={[styles.topBar, {backgroundColor: color}]} />

      <View style={styles.inner}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.emojiWrap, {backgroundColor: color + '20'}]}>
            <Text style={styles.emoji}>{data.emoji || '📊'}</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>This Week</Text>
            <Text style={styles.subtitle}>
              {data.entry_count} {data.entry_count === 1 ? 'entry' : 'entries'} ·{' '}
              <Text style={{color, fontWeight: '800', textTransform: 'capitalize'}}>
                {data.dominant_vibe || 'mixed'}
              </Text>{' '}
              dominant
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.refreshBtn, {backgroundColor: color + '15'}]}
            onPress={fetch_}
            activeOpacity={0.7}>
            <Icon name="refresh" size={15} color={color} />
          </TouchableOpacity>
        </View>

        {/* Summary */}
        <Text style={styles.summary}>{data.summary}</Text>

        {/* Expandable details */}
        {expanded && (
          <>
            {data.highlights?.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Highlights</Text>
                <View style={styles.pillRow}>
                  {data.highlights.map((h, i) => (
                    <Pill key={i} text={h} icon="star-outline" color="#10b981" />
                  ))}
                </View>
              </View>
            )}
            {data.patterns?.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Patterns</Text>
                <View style={styles.pillRow}>
                  {data.patterns.map((p, i) => (
                    <Pill key={i} text={p} icon="chart-timeline-variant" color={ACCENT} />
                  ))}
                </View>
              </View>
            )}
            {data.next_steps?.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Next Steps</Text>
                <View style={styles.pillRow}>
                  {data.next_steps.map((s, i) => (
                    <Pill key={i} text={s} icon="arrow-right-circle-outline" color="#f59e0b" />
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        <TouchableOpacity
          style={styles.expandBtn}
          onPress={() => setExpanded(v => !v)}
          activeOpacity={0.7}>
          <Text style={[styles.expandText, {color}]}>
            {expanded ? 'Show less' : 'See highlights & next steps'}
          </Text>
          <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={color} />
        </TouchableOpacity>
      </View>
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
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ede9fe',
  },
  loadingText: {fontSize: 13, color: '#9ca3af', fontWeight: '500'},
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: ACCENT,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  topBar: {height: 3},
  inner: {padding: 16},
  header: {flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12},
  emojiWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {fontSize: 22},
  headerText: {flex: 1},
  title: {fontSize: 15, fontWeight: '800', color: '#1a1a2e'},
  subtitle: {fontSize: 12, color: '#9ca3af', marginTop: 2, fontWeight: '500'},
  refreshBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summary: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 20,
    fontWeight: '500',
    marginBottom: 4,
  },
  section: {marginTop: 12},
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  pillRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 6},
  pill: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    maxWidth: '100%',
  },
  pillText: {fontSize: 12, fontWeight: '600', flex: 1, lineHeight: 16},
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  expandText: {fontSize: 12, fontWeight: '700'},
});

export default WeeklySummaryCard;
