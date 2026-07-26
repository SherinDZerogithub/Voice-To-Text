import React, {useEffect, useState, forwardRef, useImperativeHandle} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// ─── Static fallback affirmations per vibe ────────────────────────────────────────

const FALLBACK_AFFIRMATIONS = {
  calm: 'You have found a quiet center within the noise. Let this stillness anchor you as you move through the day.',
  peaceful:
    'There is grace in the peace you carry right now. You are exactly where you need to be.',
  happy:
    'Your joy today is real, and it belongs to you. Carry it forward and let it light up the spaces around you.',
  energetic:
    'You are a force of momentum right now. Channel this energy toward something that matters to your future self.',
  sad: 'Your pain is not a sign of weakness. Feeling deeply means you are fully alive — and that takes courage.',
  anxious:
    'You have navigated uncertainty before and arrived on the other side. You are more capable than your fear suggests.',
  chaotic:
    "Chaos is not your natural state — it's a season. You will find your footing again, and you don't have to rush.",
  gloomy:
    "Even the heaviest clouds don't last forever. You are allowed to rest under them without pretending they aren't there.",
  tense:
    "You are carrying more than you should have to right now. It's okay to set something down — even briefly.",
  lonely:
    'Even in solitude, you are not forgotten. The connection you need exists — and you are worthy of it.',
  nostalgic:
    "The past you're remembering helped build the person reading this. Honor it, then gently return to the now.",
  hopeful:
    "The future you're hoping for is not naïve — it's a compass. Let it guide your next small step.",
  cozy: 'Softness and warmth are not small things — they are restorative. You deserve every moment of this comfort.',
  melancholic:
    'Beauty and sadness live side by side in you right now. That bittersweet feeling is deeply human.',
  pensive:
    'Your willingness to sit with hard questions is wisdom in action. Not everything needs an answer today.',
  default:
    "Whatever you're carrying today, you don't have to carry it perfectly. You are doing better than you know.",
};

const getStaticAffirmation = vibe => {
  const key = vibe?.toLowerCase() ?? 'default';
  return FALLBACK_AFFIRMATIONS[key] ?? FALLBACK_AFFIRMATIONS.default;
};

// ─── Main component ───────────────────────────────────────────────────────────

const AffirmationBanner = forwardRef(({vibe, moodColor, token, backendUrl, savedAffirmation}, ref) => {
  const [affirmation, setAffirmation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [source, setSource] = useState('static'); // 'static' | 'ai'
  const [collapsed, setCollapsed] = useState(false);

  const color = moodColor || '#6c5ce7';

  // Expose affirmation via ref
  useImperativeHandle(ref, () => ({
    getAffirmation: () => affirmation,
  }));

  // Load static affirmation immediately when vibe changes, then try AI upgrade
  useEffect(() => {
    if (savedAffirmation) {
      setAffirmation(savedAffirmation);
      setSource('saved');
      setCollapsed(false);
      return;
    }

    if (!vibe) {
      setAffirmation('');
      return;
    }

    // Immediately show static affirmation
    setAffirmation(getStaticAffirmation(vibe));
    setSource('static');
    setCollapsed(false);

    // Then try to upgrade with AI if we have a backend + token
    if (!backendUrl || !token) {
      return;
    }

    let cancelled = false;
    const fetchAIAffirmation = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${backendUrl}/affirmation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({vibe}),
        });
        if (!response.ok) {
          throw new Error('AI affirmation failed');
        }
        const data = await response.json();
        if (!cancelled && data.affirmation) {
          setAffirmation(data.affirmation);
          setSource('ai');
        }
      } catch {
        // Keep static affirmation silently
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchAIAffirmation();
    return () => {
      cancelled = true;
    };
  }, [vibe, backendUrl, token]);

  if (!vibe || !affirmation) {
    return null;
  }

  return (
    <View style={[styles.container, {borderColor: color + '30'}]}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setCollapsed(c => !c)}
        activeOpacity={0.75}>
        <View style={[styles.iconWrap, {backgroundColor: color + '18'}]}>
          <Icon name="heart-outline" size={16} color={color} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>A Little Kindness for You</Text>
          <Text style={styles.headerSub}>
            {source === 'ai'
              ? '✦ Personalized affirmation'
              : source === 'saved'
              ? 'Saved affirmation'
              : 'Daily affirmation'}
            {isLoading ? ' · personalizing…' : ''}
          </Text>
        </View>
        <Icon
          name={collapsed ? 'chevron-down' : 'chevron-up'}
          size={17}
          color="#bbb"
        />
      </TouchableOpacity>

      {/* Affirmation */}
      {!collapsed && (
        <View style={styles.affirmationBox}>
          <Text style={styles.affirmationText}>{affirmation}</Text>
        </View>
       )}
     </View>
    );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
    gap: 10,
    elevation: 3,
    shadowColor: '#6c5ce7',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.07,
    shadowRadius: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {flex: 1},
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2d3436',
    letterSpacing: -0.2,
  },
  headerSub: {
    fontSize: 11,
    color: '#aaa',
    fontWeight: '600',
    marginTop: 1,
  },
  affirmationBox: {
    backgroundColor: '#fcfcff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  affirmationText: {
    fontSize: 15,
    color: '#444',
    lineHeight: 24,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

export default AffirmationBanner;
