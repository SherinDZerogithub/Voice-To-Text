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

const TagChip = ({label, color, icon}) => (
  <View style={[styles.chip, {backgroundColor: color + '15', borderColor: color + '30'}]}>
    <Icon name={icon} size={11} color={color} />
    <Text style={[styles.chipText, {color}]}>{label}</Text>
  </View>
);

const TriggerInsightsCard = ({token, backendUrl, days = 30}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const fetch_ = useCallback(async () => {
    if (!token || !backendUrl) return;
    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/trigger-analysis?days=${days}`, {
        headers: {Authorization: `Bearer ${token}`},
      });
      if (!res.ok) return;
      const json = await res.json();
      setData(json);
      Animated.timing(fadeAnim, {toValue: 1, duration: 400, useNativeDriver: true}).start();
    } catch (e) {
      console.warn('[TriggerInsights]', e);
    } finally {
      setLoading(false);
    }
  }, [token, backendUrl, days]);

  useEffect(() => {
    fetch_();
  }, [fetch_]);

  if (loading) {
    return (
      <View style={styles.loadingCard}>
        <ActivityIndicator size="small" color={ACCENT} />
        <Text style={styles.loadingText}>Analysing your patterns…</Text>
      </View>
    );
  }

  if (!data || data.source === 'no_data') return null;
  if (!data.triggers?.length && !data.coping_themes?.length) return null;

  return (
    <Animated.View style={[styles.card, {opacity: fadeAnim}]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconWrap, {backgroundColor: '#ef444415'}]}>
          <Icon name="lightning-bolt-outline" size={18} color="#ef4444" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Emotional Patterns</Text>
          <Text style={styles.subtitle}>
            From {data.entry_count} journal {data.entry_count === 1 ? 'entry' : 'entries'} · last {data.days} days
          </Text>
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={fetch_}
          activeOpacity={0.7}>
          <Icon name="refresh" size={14} color="#9ca3af" />
        </TouchableOpacity>
      </View>

      {/* Triggers */}
      {data.triggers?.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="alert-circle-outline" size={13} color="#ef4444" />
            <Text style={[styles.sectionLabel, {color: '#ef4444'}]}>Recurring Triggers</Text>
          </View>
          <View style={styles.chipRow}>
            {data.triggers.map((t, i) => (
              <TagChip key={i} label={t} color="#ef4444" icon="minus-circle-outline" />
            ))}
          </View>
        </View>
      )}

      {/* Coping themes */}
      {data.coping_themes?.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="shield-check-outline" size={13} color="#10b981" />
            <Text style={[styles.sectionLabel, {color: '#10b981'}]}>Coping Strategies</Text>
          </View>
          <View style={styles.chipRow}>
            {data.coping_themes.map((c, i) => (
              <TagChip key={i} label={c} color="#10b981" icon="plus-circle-outline" />
            ))}
          </View>
        </View>
      )}

      {data.source === 'ai' && (
        <View style={styles.aiTag}>
          <Icon name="brain" size={10} color="#9ca3af" />
          <Text style={styles.aiTagText}>NLP-powered analysis</Text>
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
    shadowColor: '#ef4444',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
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
  section: {marginBottom: 12},
  sectionHeader: {flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8},
  sectionLabel: {fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6},
  chipRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 6},
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipText: {fontSize: 12, fontWeight: '700', textTransform: 'capitalize'},
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  aiTagText: {fontSize: 10, color: '#9ca3af', fontWeight: '600'},
});

export default TriggerInsightsCard;
