import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  PanResponder,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// ─── SwipeableHistoryItem ────────────────────────────────────────────────────

const SWIPE_THRESHOLD = -80;
const DELETE_ZONE = -100;

const SwipeableHistoryItem = ({ item, onSelect, onDelete }) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const deleteOpacity = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dy) < Math.abs(g.dx),
      onPanResponderGrant: () => {
        translateX.setOffset(isOpen.current ? SWIPE_THRESHOLD : 0);
        translateX.setValue(0);
      },
      onPanResponderMove: (_, g) => {
        const newVal = g.dx;
        // Only allow left swipe
        if (newVal < 0 || isOpen.current) {
          translateX.setValue(Math.max(newVal, DELETE_ZONE * 1.2));
          const progress = Math.min(Math.abs(newVal) / Math.abs(SWIPE_THRESHOLD), 1);
          deleteOpacity.setValue(progress);
        }
      },
      onPanResponderRelease: (_, g) => {
        translateX.flattenOffset();
        const currentVal = isOpen.current
          ? SWIPE_THRESHOLD + g.dx
          : g.dx;

        if (currentVal < SWIPE_THRESHOLD) {
          // Snap open
          Animated.spring(translateX, {
            toValue: SWIPE_THRESHOLD,
            useNativeDriver: true,
          }).start();
          Animated.timing(deleteOpacity, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }).start();
          isOpen.current = true;
        } else {
          // Snap closed
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
          Animated.timing(deleteOpacity, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }).start();
          isOpen.current = false;
        }
      },
    }),
  ).current;

  const closeSwipe = () => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
    Animated.timing(deleteOpacity, { toValue: 0, duration: 150, useNativeDriver: true }).start();
    isOpen.current = false;
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Entry',
      'Remove this mood entry from your journal?',
      [
        { text: 'Cancel', style: 'cancel', onPress: closeSwipe },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(item.id),
        },
      ],
    );
  };

  return (
    <View style={styles.swipeContainer}>
      {/* Delete action behind */}
      <Animated.View style={[styles.deleteAction, { opacity: deleteOpacity }]}>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Icon name="trash-can-outline" size={22} color="#fff" />
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Swipeable card */}
      <Animated.View
        style={{ transform: [{ translateX }] }}
        {...panResponder.panHandlers}>
        <TouchableOpacity
          style={styles.historyItem}
          onPress={() => {
            if (isOpen.current) {
              closeSwipe();
            } else {
              onSelect && onSelect(item);
            }
          }}
          activeOpacity={0.75}>
          <View style={[styles.historySwatch, { backgroundColor: item.color }]}>
            <Text style={styles.historyEmoji}>{item.emoji}</Text>
          </View>
          <View style={styles.historyInfo}>
            <Text style={styles.historyTime}>{item.timestamp}</Text>
            <Text style={styles.historyCaption} numberOfLines={3}>
              {item.caption}
            </Text>
            {item.gentle_reminder ? (
              <View style={styles.extraRow}>
                <Icon name="lightbulb-outline" size={12} color="#f39c12" />
                <Text style={styles.extraText} numberOfLines={1}>
                  {item.gentle_reminder}
                </Text>
              </View>
            ) : null}
            {item.reflection ? (
              <View style={styles.extraRow}>
                <Icon name="journal" size={12} color="#9b59b6" />
                <Text style={styles.extraText} numberOfLines={2}>
                  {item.reflection}
                </Text>
              </View>
            ) : null}
          </View>
          <Icon name="chevron-right" size={18} color="#ccc" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

// ─── HistoryDisplay ──────────────────────────────────────────────────────────

const HistoryDisplay = ({ moodHistory, appBgColor, onSelect, onDelete }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredHistory = useCallback(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return moodHistory;
    return moodHistory.filter(
      item =>
        (item.vibe && item.vibe.toLowerCase().includes(q)) ||
        (item.caption && item.caption.toLowerCase().includes(q)) ||
        (item.emoji && item.emoji.includes(q)) ||
        (item.reflection && item.reflection.toLowerCase().includes(q)) ||
        (item.gentle_reminder && item.gentle_reminder.toLowerCase().includes(q)),
    );
  }, [moodHistory, searchQuery])();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mood Journal</Text>

      {/* Search bar */}
      <View style={styles.searchWrapper}>
        <Icon name="magnify" size={18} color="#aaa" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by vibe or caption…"
          placeholderTextColor="#bbb"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          clearButtonMode="while-editing"
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
            <Icon name="close-circle" size={16} color="#bbb" />
          </TouchableOpacity>
        )}
      </View>

      {/* Result count when searching */}
      {searchQuery.length > 0 && (
        <Text style={styles.resultCount}>
          {filteredHistory.length} result{filteredHistory.length !== 1 ? 's' : ''} for "{searchQuery}"
        </Text>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}>
        {filteredHistory.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon
              name={searchQuery ? 'magnify-close' : 'book-open-blank-variant'}
              size={48}
              color="#ddd"
            />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No entries match your search.' : 'No patterns recorded yet.'}
            </Text>
          </View>
        ) : (
          filteredHistory.map(item => (
            <SwipeableHistoryItem
              key={item.id}
              item={item}
              onSelect={onSelect}
              onDelete={onDelete}
            />
          ))
        )}
      </ScrollView>

      {moodHistory.length > 0 && !searchQuery && (
        <Text style={styles.swipeHint}>
          <Icon name="gesture-swipe-left" size={12} color="#ccc" /> Swipe left to delete
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    paddingTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#333',
  },

  // ── Search ──
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    paddingHorizontal: 12,
    marginBottom: 8,
    marginHorizontal: 10,
    height: 44,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    height: '100%',
  },
  clearBtn: {
    padding: 4,
  },
  resultCount: {
    fontSize: 12,
    color: '#999',
    marginHorizontal: 16,
    marginBottom: 10,
    fontStyle: 'italic',
  },

  // ── List ──
  listContent: {
    paddingBottom: 40,
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
    gap: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: '#bbb',
    fontSize: 15,
  },
  swipeHint: {
    textAlign: 'center',
    fontSize: 11,
    color: '#ccc',
    marginBottom: 8,
    fontWeight: '500',
  },

  // ── Swipeable row ──
  swipeContainer: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  deleteAction: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 100,
    borderRadius: 16,
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    alignItems: 'center',
    gap: 4,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  // ── History card ──
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  historySwatch: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  historyEmoji: {
    fontSize: 24,
  },
  historyInfo: {
    flex: 1,
  },
  historyTime: {
    fontSize: 12,
    color: '#888',
    fontWeight: '600',
    marginBottom: 4,
  },
   historyCaption: {
     fontSize: 14,
     color: '#444',
     lineHeight: 20,
   },
   extraRow: {
     flexDirection: 'row',
     alignItems: 'center',
     marginTop: 4,
     gap: 4,
   },
   extraText: {
     fontSize: 11,
     color: '#888',
     lineHeight: 14,
     flex: 1,
   },
 });

export default HistoryDisplay;