import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, {
  G,
  Rect,
  Circle,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const DICE_PROMPTS = [
  {
    emoji: '✍️',
    prompt: 'Write one sentence about your morning',
    category: 'reflection',
  },
  {
    emoji: '🙏',
    prompt: 'What are you grateful for today?',
    category: 'gratitude',
  },
  {
    emoji: '💭',
    prompt: "What's one thing on your mind?",
    category: 'thought',
  },
  {
    emoji: '🌟',
    prompt: "What's one good thing that happened?",
    category: 'positive',
  },
  {
    emoji: '🎯',
    prompt: "What's your intention for today?",
    category: 'intention',
  },
  {
    emoji: '💪',
    prompt: 'What challenge are you facing?',
    category: 'challenge',
  },
];

const MOOD_DICE_STORAGE_PREFIX = '@voice_to_text_mood_dice';

const getLocalDayKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTimeUntilNextLocalDay = () => {
  const nextMidnight = new Date();
  nextMidnight.setHours(24, 0, 0, 0);
  return nextMidnight.getTime() - Date.now();
};

const getMoodDiceStorageKey = (token, dayKey) =>
  `${MOOD_DICE_STORAGE_PREFIX}:${token || 'guest'}:${dayKey}`;

const MoodDice = ({onJournalEntry, onTabChange, token}) => {
  const [isRolling, setIsRolling] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState(null);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [journalText, setJournalText] = useState('');
  const [rollHistory, setRollHistory] = useState([]);
  const [currentFace, setCurrentFace] = useState(() => Math.floor(Math.random() * 6) + 1);
  const [storageDayKey, setStorageDayKey] = useState(() => getLocalDayKey());
  const [isHydrated, setIsHydrated] = useState(false);

  const storageKey = getMoodDiceStorageKey(token, storageDayKey);

  useEffect(() => {
    let isMounted = true;

    const hydrateState = async () => {
      try {
        const stored = await AsyncStorage.getItem(storageKey);
        if (!isMounted) {
          return;
        }

        if (stored) {
          const parsed = JSON.parse(stored);
          setRollHistory(Array.isArray(parsed.rollHistory) ? parsed.rollHistory : []);
        } else {
          setRollHistory([]);
        }
      } catch (error) {
        console.warn('Failed to restore Mood Dice history:', error);
      } finally {
        if (isMounted) {
          setIsHydrated(true);
        }
      }
    };

    setIsHydrated(false);
    hydrateState();

    return () => {
      isMounted = false;
    };
  }, [storageKey]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    AsyncStorage.setItem(storageKey, JSON.stringify({rollHistory})).catch(error => {
      console.warn('Failed to persist Mood Dice history:', error);
    });
  }, [isHydrated, rollHistory, storageKey]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setStorageDayKey(getLocalDayKey());
      setRollHistory([]);
      setCurrentPrompt(null);
      setShowPromptModal(false);
      setJournalText('');
      setIsRolling(false);
    }, Math.max(0, getTimeUntilNextLocalDay()));

    return () => clearTimeout(timeoutId);
  }, [storageDayKey]);

  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  const rollDice = () => {
    if (isRolling) {
      return;
    }

    setIsRolling(true);
    setCurrentFace(Math.floor(Math.random() * 6) + 1);
    setJournalText('');

    // Rotation animation
    rotateAnim.setValue(0);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.spring(scaleAnim, {
            toValue: 1.15,
            friction: 4,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 4,
            tension: 40,
            useNativeDriver: true,
          }),
        ]),
      ]),
      Animated.timing(bounceAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      const randomPrompt =
        DICE_PROMPTS[Math.floor(Math.random() * DICE_PROMPTS.length)];
      setCurrentPrompt(randomPrompt);
      setShowPromptModal(true);
      setIsRolling(false);
      setRollHistory(prev => [randomPrompt, ...prev.slice(0, 4)]);
    });
  };

  const handleSaveEntry = () => {
    if (journalText.trim()) {
      onJournalEntry?.({
        prompt: currentPrompt.prompt,
        response: journalText,
        category: currentPrompt.category,
        timestamp: new Date().toISOString(),
      });
      setShowPromptModal(false);
      setJournalText('');
      // Optionally navigate to journal tab
      onTabChange?.('journal');
    }
  };

  const DiceFace = ({number}) => {
    const dotPositions = {
      1: [[50, 50]],
      2: [
        [25, 25],
        [75, 75],
      ],
      3: [
        [25, 25],
        [50, 50],
        [75, 75],
      ],
      4: [
        [25, 25],
        [75, 25],
        [25, 75],
        [75, 75],
      ],
      5: [
        [25, 25],
        [75, 25],
        [50, 50],
        [25, 75],
        [75, 75],
      ],
      6: [
        [25, 25],
        [75, 25],
        [25, 50],
        [75, 50],
        [25, 75],
        [75, 75],
      ],
    };

    return (
      <Svg width="100" height="100" viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id={`grad${number}`} x1="0" y1="0" x2="100" y2="100">
            <Stop offset="0%" stopColor="#fff" stopOpacity="1" />
            <Stop offset="100%" stopColor="#f0f0f0" stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect
          width="100"
          height="100"
          fill={`url(#grad${number})`}
          stroke="#6c5ce7"
          strokeWidth="2"
          rx="8"
        />
        {dotPositions[number].map((pos, idx) => (
          <Circle key={idx} cx={pos[0]} cy={pos[1]} r="6" fill="#6c5ce7" />
        ))}
      </Svg>
    );
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '720deg'],
  });

  const bounce = bounceAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -20, 0],
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon name="dice-6" size={24} color="#FFD93D" />
        <Text style={styles.title}>Roll Into Reflection</Text>
        <Text style={styles.subtitle}>Let chance choose a prompt</Text>
      </View>

      <View style={styles.diceSection}>
        <Animated.View
          style={[
            styles.diceWrapper,
            {
              transform: [
                {rotate: rotation},
                {scale: scaleAnim},
                {translateY: bounce},
              ],
            },
          ]}>
          <TouchableOpacity
            onPress={rollDice}
            disabled={isRolling}
            activeOpacity={0.8}
            style={styles.diceButton}>
            <DiceFace number={currentFace} />
          </TouchableOpacity>
        </Animated.View>

        <Text style={styles.diceHint}>
          {isRolling ? '🎲 Rolling...' : 'Tap to roll'}
        </Text>
      </View>

      {/* Recent Rolls */}
      {rollHistory.length > 0 && (
        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>Prompts You’ve Picked</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.historyScroll}>
            {rollHistory.map((prompt, idx) => (
              <View key={idx} style={styles.historyCard}>
                <Text style={styles.historyEmoji}>{prompt.emoji}</Text>
                <Text style={styles.historyText} numberOfLines={2}>
                  {prompt.prompt}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Prompt Modal */}
      <Modal
        visible={showPromptModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPromptModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              onPress={() => setShowPromptModal(false)}
              style={styles.closeButton}>
              <Icon name="close" size={24} color="#2d3436" />
            </TouchableOpacity>

            {currentPrompt && (
              <>
                <Text style={styles.modalEmoji}>{currentPrompt.emoji}</Text>
                <Text style={styles.modalPrompt}>{currentPrompt.prompt}</Text>

                <TextInput
                  style={styles.journalInput}
                  placeholder="Write your response here..."
                  placeholderTextColor="#ccc"
                  multiline
                  numberOfLines={6}
                  value={journalText}
                  onChangeText={setJournalText}
                  textAlignVertical="top"
                />

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    onPress={() => setShowPromptModal(false)}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.saveButton,
                      !journalText.trim() && styles.saveButtonDisabled,
                    ]}
                    onPress={handleSaveEntry}
                    disabled={!journalText.trim()}>
                    <Icon name="check" size={20} color="#fff" />
                    <Text style={styles.saveButtonText}>Save Entry</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#F8F7FF',
    borderRadius: 16,
    marginVertical: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2d3436',
    flex: 1,
  },
  subtitle: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  diceSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
  },
  diceWrapper: {
    marginBottom: 12,
  },
  diceButton: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diceHint: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  historySection: {
    marginTop: 12,
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
  },
  historyScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginRight: 10,
    width: 120,
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: '#FFD93D',
  },
  historyEmoji: {
    fontSize: 20,
    marginBottom: 6,
  },
  historyText: {
    fontSize: 11,
    color: '#555',
    textAlign: 'center',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 32,
    maxHeight: '85%',
  },
  closeButton: {
    alignSelf: 'flex-end',
    marginBottom: 12,
  },
  modalEmoji: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 12,
  },
  modalPrompt: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2d3436',
    textAlign: 'center',
    marginBottom: 20,
  },
  journalInput: {
    backgroundColor: '#F8F7FF',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#2d3436',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E8E6F5',
    fontFamily: 'System',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#F0EFF8',
  },
  cancelButtonText: {
    color: '#6c5ce7',
    fontWeight: '600',
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: '#6c5ce7',
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default MoodDice;
