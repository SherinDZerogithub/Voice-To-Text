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

const MoodForecastCard = ({token, backendUrl}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const fetch_ = useCallback(async () => {
    if (!token || !backendUrl) return;
    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/mood-forecast`, {
        headers: {Authorization: `Bearer ${token}`},
      });
      if (!res.ok) return;
      const json = await res.json();
      if (json.source === 'insufficient_data') return;
      setData(json);
      Animated.timing(fadeAnim, {toValue: 1, duration: 500, useNativeDriver: true}).start();
    } catch (e) {
      console.warn('[MoodForecast]', e);
    } finally {
      setLoading(false);
    }
  }, [token, backendUrl]);

  useEffect(() => {
    fetch_();
  }, [fetch_]);

  // Pulse animation for the confidence ring
  useEffect(() => {
    if (!data) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {toValue: 1.06, duration: 1200, useNativeDriver: true}),
        Animated.timing(pulseAnim, {toValue: 1, duration: 1200, useNativeDriver: true}),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [data]);

  if (loading) {
    return (
      <View style={styles.loadingCard}>
        <ActivityIndicator size="small" color={ACCENT} />
        <Text style={styles.loadingText}>Forecasting your mood…</Text>
      </View>
    );
  }

  if (!data) return null;

  const color = data.color || ACCENT;
  const confidencePct = Math.round((data.confidence || 0) * 100);

  return (
    <Animated.View style={[styles.card, {opacity: fadeAnim}]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, {backgroundColor: color + '18'}]}>
          <Icon name="crystal-ball" size={18} color={color} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Today's Emotional Weather</Text>
          <Text style={styles.subtitle}>A gentle look at your mood patterns</Text>
        </View>
        <TouchableOpacity
          style={[styles.refreshBtn, {backgroundColor: color + '15'}]}
          onPress={fetch_}
          activeOpacity={0.7}>
          <Icon name="refresh" size={14} color={color} />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        {/* Animated emoji */}
        <Animated.View
          style={[
            styles.emojiRing,
            {borderColor: color + '40', backgroundColor: color + '12'},
            {transform: [{scale: pulseAnim}]},
          ]}>
          <Text style={styles.emoji}>{data.emoji || '🌈'}</Text>
        </Animated.View>

        <View style={styles.bodyText}>
          <Text style={[styles.vibeName, {color}]}>
            {data.predicted_vibe?.charAt(0).toUpperCase() + data.predicted_vibe?.slice(1)}
          </Text>
          <View style={styles.confidenceRow}>
            <View style={styles.confidenceTrack}>
              <View
                style={[
                  styles.confidenceBar,
                  {width: `${confidencePct}%`, backgroundColor: color},
                ]}
              />
            </View>
            <Text style={[styles.confidencePct, {color}]}>{confidencePct}%</Text>
          </View>
          <Text style={styles.reasoning} numberOfLines={3}>{data.reasoning}</Text>
        </View>
      </View>

      {data.suggested_actions?.length > 0 && (
        <View style={styles.actionsRow}>
          {data.suggested_actions.map((action, i) => (
            <View key={i} style={[styles.actionChip, {borderColor: color + '30', backgroundColor: color + '0C'}]}>
              <Icon name="lightning-bolt" size={10} color={color} />
              <Text style={[styles.actionText, {color}]} numberOfLines={1}>{action}</Text>
            </View>
          ))}
        </View>
      )}

      {data.source === 'ai' && (
        <View style={styles.aiTag}>
          <Icon name="brain" size={10} color="#9ca3af" />
          <Text style={styles.aiTagText}>AI-powered</Text>
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
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ede9fe',
  },
  loadingText: {fontSize: 13, color: '#9ca3af', fontWeight: '500'},
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: ACCENT,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12},
  emojiRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emoji: {fontSize: 30},
  bodyText: {flex: 1},
  vibeName: {fontSize: 18, fontWeight: '900', letterSpacing: -0.3, marginBottom: 6},
  confidenceRow: {flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6},
  confidenceTrack: {
    flex: 1,
    height: 5,
    backgroundColor: '#f3f4f6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  confidenceBar: {height: '100%', borderRadius: 3},
  confidencePct: {fontSize: 11, fontWeight: '800', width: 32, textAlign: 'right'},
  reasoning: {fontSize: 12, color: '#6b7280', lineHeight: 17, fontWeight: '500'},
  actionsRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8},
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionText: {fontSize: 11, fontWeight: '700'},
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    justifyContent: 'flex-end',
  },
  aiTagText: {fontSize: 10, color: '#9ca3af', fontWeight: '600'},
});

export default MoodForecastCard;
