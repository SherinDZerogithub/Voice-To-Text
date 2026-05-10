import React, {useCallback, useRef, useState} from 'react';
import {
  Alert,
  Animated,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Svg, {Path, Rect} from 'react-native-svg';

const SWIPE_THRESHOLD = -80;
const DELETE_ZONE = -100;
const ACCENT = '#7c6ff7';

const parseDoodles = doodles => {
  if (!doodles) return [];
  try {
    const parsed = typeof doodles === 'string' ? JSON.parse(doodles) : doodles;
    const list = Array.isArray(parsed) ? parsed : [parsed];
    return list.filter(d => d?.paths?.length);
  } catch {
    return [];
  }
};

const pointsToPath = points => {
  if (!points?.length) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y} L ${points[0].x + 0.1} ${points[0].y}`;
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
};

const DoodlePreview = ({doodle}) => (
  <View style={styles.doodlePreview}>
    <Svg width="100%" height={56} viewBox="0 0 360 280">
      <Rect width="360" height="280" fill={doodle.bgColor || '#fffdf7'} />
      {(doodle.paths || []).slice(0, 24).map((path, i) => (
        <Path
          key={`${path.id || i}`}
          d={pointsToPath(path.points)}
          stroke={path.color || '#2d3436'}
          strokeWidth={path.size || 4}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ))}
    </Svg>
  </View>
);

const MoodTag = ({label, color}) => (
  <View style={[styles.moodTag, {backgroundColor: color + '20', borderColor: color + '40'}]}>
    <Text style={[styles.moodTagText, {color}]}>{label}</Text>
  </View>
);

const SwipeableHistoryItem = ({item, onSelect, onDelete, index}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const deleteOpacity = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);
  const doodles = parseDoodles(item.doodles);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dy) < Math.abs(g.dx),
      onPanResponderGrant: () => {
        translateX.setOffset(isOpen.current ? SWIPE_THRESHOLD : 0);
        translateX.setValue(0);
      },
      onPanResponderMove: (_, g) => {
        if (g.dx < 0 || isOpen.current) {
          translateX.setValue(Math.max(g.dx, DELETE_ZONE * 1.2));
          deleteOpacity.setValue(Math.min(Math.abs(g.dx) / Math.abs(SWIPE_THRESHOLD), 1));
        }
      },
      onPanResponderRelease: (_, g) => {
        translateX.flattenOffset();
        const val = isOpen.current ? SWIPE_THRESHOLD + g.dx : g.dx;
        if (val < SWIPE_THRESHOLD) {
          Animated.spring(translateX, {toValue: SWIPE_THRESHOLD, useNativeDriver: true}).start();
          Animated.timing(deleteOpacity, {toValue: 1, duration: 150, useNativeDriver: true}).start();
          isOpen.current = true;
        } else {
          Animated.spring(translateX, {toValue: 0, useNativeDriver: true}).start();
          Animated.timing(deleteOpacity, {toValue: 0, duration: 150, useNativeDriver: true}).start();
          isOpen.current = false;
        }
      },
    }),
  ).current;

  const closeSwipe = () => {
    Animated.spring(translateX, {toValue: 0, useNativeDriver: true}).start();
    Animated.timing(deleteOpacity, {toValue: 0, duration: 150, useNativeDriver: true}).start();
    isOpen.current = false;
  };

  const handleDelete = () => {
    Alert.alert('Delete Entry', 'Remove this mood entry?', [
      {text: 'Cancel', style: 'cancel', onPress: closeSwipe},
      {text: 'Delete', style: 'destructive', onPress: () => onDelete(item.id)},
    ]);
  };

  const color = item.color || ACCENT;

  return (
    <View style={styles.swipeContainer}>
      <Animated.View style={[styles.deleteAction, {opacity: deleteOpacity}]}>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Icon name="trash-can-outline" size={20} color="#fff" />
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </Animated.View>

      <Animated.View style={{transform: [{translateX}]}} {...panResponder.panHandlers}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => isOpen.current ? closeSwipe() : onSelect?.(item)}
          activeOpacity={0.8}>

          {/* Color accent bar */}
          <View style={[styles.accentBar, {backgroundColor: color}]} />

          <View style={styles.cardInner}>
            {/* Emoji swatch */}
            <View style={[styles.emojiSwatch, {backgroundColor: color + '20'}]}>
              <Text style={styles.emoji}>{item.emoji || '🌈'}</Text>
            </View>

            {/* Content */}
            <View style={styles.cardContent}>
              <View style={styles.cardTopRow}>
                <View style={[styles.vibePill, {backgroundColor: color + '18'}]}>
                  <Text style={[styles.vibeText, {color}]}>
                    {item.vibe?.charAt(0).toUpperCase() + item.vibe?.slice(1) || 'Mood'}
                  </Text>
                </View>
                <Text style={styles.timeText}>{item.timestamp}</Text>
              </View>

              <Text style={styles.captionText} numberOfLines={2}>{item.caption}</Text>

              {/* Extra metadata */}
              <View style={styles.metaRow}>
                {item.gentle_reminder ? (
                  <MoodTag label="💡 Reminder" color="#f59e0b" />
                ) : null}
                {item.reflection ? (
                  <MoodTag label="📓 Journal" color="#8b5cf6" />
                ) : null}
                {doodles.length > 0 ? (
                  <MoodTag label={`✏️ ${doodles.length} doodle${doodles.length > 1 ? 's' : ''}`} color={ACCENT} />
                ) : null}
              </View>

              {doodles.length > 0 && <DoodlePreview doodle={doodles[0]} />}
            </View>

            <Icon name="chevron-right" size={16} color="#d1d5db" />
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const HistoryDisplay = ({moodHistory, onSelect, onDelete}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredHistory = useCallback(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return moodHistory;
    return moodHistory.filter(
      item =>
        item.vibe?.toLowerCase().includes(q) ||
        item.caption?.toLowerCase().includes(q) ||
        item.emoji?.includes(q) ||
        item.reflection?.toLowerCase().includes(q) ||
        item.gentle_reminder?.toLowerCase().includes(q),
    );
  }, [moodHistory, searchQuery])();

  // Group by date
  const grouped = useCallback(() => {
    const groups = {};
    filteredHistory.forEach(item => {
      const date = item.rawTimestamp
        ? new Date(item.rawTimestamp).toDateString()
        : 'Unknown';
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
    });
    return Object.entries(groups);
  }, [filteredHistory])();

  const formatGroupDate = dateStr => {
    if (dateStr === 'Unknown') return dateStr;
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], {weekday: 'long', month: 'short', day: 'numeric'});
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Mood Journal</Text>
          <Text style={styles.subtitle}>{moodHistory.length} entries recorded</Text>
        </View>
        <View style={styles.headerBadge}>
          <Icon name="book-heart-outline" size={20} color={ACCENT} />
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrapper}>
        <Icon name="magnify" size={18} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search moods, vibes, reflections…"
          placeholderTextColor="#c4b5fd"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close-circle" size={16} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      {searchQuery.length > 0 && (
        <Text style={styles.resultCount}>
          {filteredHistory.length} result{filteredHistory.length !== 1 ? 's' : ''} for "{searchQuery}"
        </Text>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
        {filteredHistory.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Icon name={searchQuery ? 'magnify-close' : 'book-open-blank-variant'} size={36} color={ACCENT} />
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No matches found' : 'Your journal is empty'}
            </Text>
            <Text style={styles.emptyText}>
              {searchQuery ? 'Try a different search term' : 'Start logging your moods to see them here'}
            </Text>
          </View>
        ) : (
          grouped.map(([date, items]) => (
            <View key={date}>
              {/* Date group header */}
              <View style={styles.dateGroup}>
                <View style={styles.dateDot} />
                <Text style={styles.dateGroupText}>{formatGroupDate(date)}</Text>
                <View style={styles.dateLine} />
                <View style={[styles.dateCountBadge]}>
                  <Text style={styles.dateCountText}>{items.length}</Text>
                </View>
              </View>
              {items.map((item, i) => (
                <SwipeableHistoryItem
                  key={item.id}
                  item={item}
                  index={i}
                  onSelect={onSelect}
                  onDelete={onDelete}
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>

      {moodHistory.length > 0 && !searchQuery && (
        <View style={styles.swipeHintRow}>
          <Icon name="gesture-swipe-left" size={13} color="#c4b5fd" />
          <Text style={styles.swipeHint}>Swipe left to delete</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, width: '100%'},

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  title: {fontSize: 26, fontWeight: '900', color: '#1a1a2e', letterSpacing: -0.5},
  subtitle: {fontSize: 12, color: '#9ca3af', fontWeight: '600', marginTop: 2},
  headerBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: ACCENT + '15',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: ACCENT + '25',
  },

  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f7ff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e5e3f5',
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 8,
    gap: 10,
  },
  searchInput: {flex: 1, fontSize: 14, color: '#1a1a2e', fontWeight: '500'},
  resultCount: {fontSize: 12, color: '#9ca3af', marginBottom: 10, marginLeft: 4, fontStyle: 'italic'},

  listContent: {paddingBottom: 40, paddingTop: 4},

  dateGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  dateDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ACCENT,
  },
  dateGroupText: {fontSize: 12, fontWeight: '800', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8},
  dateLine: {flex: 1, height: 1, backgroundColor: '#e5e7eb'},
  dateCountBadge: {
    backgroundColor: ACCENT + '15',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  dateCountText: {fontSize: 11, fontWeight: '800', color: ACCENT},

  swipeContainer: {marginBottom: 10, borderRadius: 20, overflow: 'hidden'},
  deleteAction: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 100,
    borderRadius: 20,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {alignItems: 'center', gap: 4},
  deleteButtonText: {color: '#fff', fontSize: 11, fontWeight: '700'},

  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#6c5ce7',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  accentBar: {height: 3, width: '100%'},
  cardInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    gap: 12,
  },
  emojiSwatch: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emoji: {fontSize: 24},
  cardContent: {flex: 1},
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  vibePill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  vibeText: {fontSize: 12, fontWeight: '800', textTransform: 'capitalize'},
  timeText: {fontSize: 11, color: '#9ca3af', fontWeight: '600'},
  captionText: {fontSize: 13, color: '#374151', lineHeight: 19, fontWeight: '500'},
  metaRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8},
  moodTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  moodTagText: {fontSize: 11, fontWeight: '700'},
  doodlePreview: {
    width: '100%',
    height: 56,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    marginTop: 8,
  },

  emptyState: {alignItems: 'center', marginTop: 60, gap: 12},
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: ACCENT + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {fontSize: 17, fontWeight: '800', color: '#374151'},
  emptyText: {fontSize: 13, color: '#9ca3af', textAlign: 'center', lineHeight: 20},

  swipeHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
  },
  swipeHint: {fontSize: 11, color: '#c4b5fd', fontWeight: '600'},
});

export default HistoryDisplay;
