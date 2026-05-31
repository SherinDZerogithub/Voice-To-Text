import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  TextInput,
  Dimensions,
} from 'react-native';
import Svg, {
  G,
  Circle,
  Ellipse,
  Path,
  Rect,
  Defs,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const {width} = Dimensions.get('window');

const MOOD_KEYWORDS = {
  happy: [
    'happy',
    'great',
    'wonderful',
    'amazing',
    'excited',
    'joyful',
    'love',
  ],
  sad: ['sad', 'down', 'depressed', 'unhappy', 'blue', 'down', 'terrible'],
  calm: ['calm', 'peaceful', 'relaxed', 'serene', 'tranquil', 'still'],
  anxious: ['anxious', 'worried', 'nervous', 'stressed', 'tense', 'afraid'],
  hopeful: ['hopeful', 'optimistic', 'inspired', 'motivated', 'positive'],
  tired: ['tired', 'exhausted', 'drained', 'sleepy', 'fatigued'],
};

const MoodTwin = ({onCheckIn, onTabChange}) => {
  const [showModal, setShowModal] = useState(false);
  const [inputText, setInputText] = useState('');
  const [detectedMood, setDetectedMood] = useState('neutral');
  const [avatarState, setAvatarState] = useState({
    mood: 'neutral',
    expression: 'neutral',
    color: '#6c5ce7',
  });

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const eyeAnim = useRef(new Animated.Value(0)).current;
  const mouthAnim = useRef(new Animated.Value(0)).current;

  const detectMood = text => {
    const lowerText = text.toLowerCase();
    for (const [mood, keywords] of Object.entries(MOOD_KEYWORDS)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return mood;
      }
    }
    return 'neutral';
  };

  const getMoodConfig = mood => {
    const configs = {
      happy: {
        color: '#FFD93D',
        expression: 'smile',
        message: '✨ That sounds wonderful!',
        action: 'showConfetti',
      },
      sad: {
        color: '#95B8D1',
        expression: 'sad',
        message: "💙 I'm here for you",
        action: 'showBreathing',
      },
      calm: {
        color: '#6BCB77',
        expression: 'peaceful',
        message: '🧘 Beautiful peace',
        action: 'none',
      },
      anxious: {
        color: '#FF6B6B',
        expression: 'worried',
        message: "🫂 Let's breathe together",
        action: 'showBreathing',
      },
      hopeful: {
        color: '#FFE66D',
        expression: 'smile',
        message: '🌟 I feel it too!',
        action: 'showConfetti',
      },
      tired: {
        color: '#D4A574',
        expression: 'tired',
        message: '😴 Rest well',
        action: 'none',
      },
      neutral: {
        color: '#6c5ce7',
        expression: 'neutral',
        message: "👋 What's on your mind?",
        action: 'none',
      },
    };
    return configs[mood] || configs.neutral;
  };

  const handleTextChange = text => {
    setInputText(text);
    const mood = detectMood(text);
    setDetectedMood(mood);

    const config = getMoodConfig(mood);
    setAvatarState({
      mood,
      expression: config.expression,
      color: config.color,
    });

    // Trigger animations based on mood
    if (config.action === 'showConfetti') {
      triggerConfetti();
    } else if (config.action === 'showBreathing') {
      triggerBreathing();
    }
  };

  const triggerConfetti = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1.2,
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
    ]).start();
  };

  const triggerBreathing = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  };

  const handleSaveCheckIn = () => {
    if (inputText.trim()) {
      onCheckIn?.({
        response: inputText,
        mood: detectedMood,
        timestamp: new Date().toISOString(),
      });
      setShowModal(false);
      setInputText('');
      setDetectedMood('neutral');
      setAvatarState({
        mood: 'neutral',
        expression: 'neutral',
        color: '#6c5ce7',
      });
    }
  };

  const Avatar = ({mood, expression, color}) => {
    const eyeY = expression === 'sad' ? 35 : expression === 'worried' ? 32 : 30;
    const mouthPath =
      expression === 'smile'
        ? 'M 35 50 Q 50 58 65 50'
        : expression === 'sad'
        ? 'M 35 55 Q 50 48 65 55'
        : expression === 'worried'
        ? 'M 40 52 Q 50 50 60 52'
        : 'M 40 50 Q 50 52 60 50';

    return (
      <Svg width="140" height="140" viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id="avatarGrad" cx="40%" cy="40%" r="60%">
            <Stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <Stop offset="100%" stopColor={color} stopOpacity="0.1" />
          </RadialGradient>
        </Defs>

        {/* Head */}
        <Circle cx="50" cy="50" r="35" fill={color} opacity="0.8" />
        <Circle cx="50" cy="50" r="35" fill="url(#avatarGrad)" />

        {/* Eyes */}
        <Circle cx="40" cy={eyeY} r="4" fill="#fff" />
        <Circle cx="60" cy={eyeY} r="4" fill="#fff" />
        <Circle cx="40" cy={eyeY} r="2.5" fill="#2d3436" />
        <Circle cx="60" cy={eyeY} r="2.5" fill="#2d3436" />

        {/* Mouth */}
        <Path d={mouthPath} stroke="#2d3436" strokeWidth="2" fill="none" />

        {/* Blush */}
        {expression === 'happy' && (
          <>
            <Ellipse cx="28" cy="45" rx="6" ry="4" fill={color} opacity="0.4" />
            <Ellipse cx="72" cy="45" rx="6" ry="4" fill={color} opacity="0.4" />
          </>
        )}
      </Svg>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon name="face-agent" size={24} color={avatarState.color} />
        <Text style={styles.title}>Mood Twin</Text>
        <Text style={styles.subtitle}>Your mood companion</Text>
      </View>

      <View style={styles.avatarSection}>
        <Animated.View
          style={[
            styles.avatarWrapper,
            {
              transform: [{scale: scaleAnim}],
              opacity: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0.7],
              }),
            },
          ]}>
          <View style={[styles.avatarGlow, {borderColor: avatarState.color}]}>
            <Avatar
              mood={avatarState.mood}
              expression={avatarState.expression}
              color={avatarState.color}
            />
          </View>
        </Animated.View>

        <Text style={[styles.moodLabel, {color: avatarState.color}]}>
          {avatarState.mood.charAt(0).toUpperCase() + avatarState.mood.slice(1)}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.checkInButton}
        onPress={() => setShowModal(true)}
        activeOpacity={0.7}>
        <Icon name="chat-outline" size={18} color="#fff" />
        <Text style={styles.checkInButtonText}>Check In</Text>
      </TouchableOpacity>

      {/* Check-in Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>What's on your mind?</Text>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={styles.closeButton}>
                <Icon name="close" size={24} color="#2d3436" />
              </TouchableOpacity>
            </View>

            <View style={styles.miniAvatarSection}>
              <Avatar
                mood={detectedMood}
                expression={getMoodConfig(detectedMood).expression}
                color={getMoodConfig(detectedMood).color}
              />
              <Text style={styles.miniMoodText}>
                {getMoodConfig(detectedMood).message}
              </Text>
            </View>

            <TextInput
              style={styles.checkInInput}
              placeholder="Tell me how you're feeling..."
              placeholderTextColor="#ccc"
              multiline
              numberOfLines={5}
              value={inputText}
              onChangeText={handleTextChange}
              textAlignVertical="top"
            />

            <View style={styles.moodIndicator}>
              <Text style={styles.moodIndicatorLabel}>Detected mood:</Text>
              <View
                style={[
                  styles.moodIndicatorBadge,
                  {backgroundColor: getMoodConfig(detectedMood).color},
                ]}>
                <Text style={styles.moodIndicatorText}>
                  {detectedMood.toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setShowModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.saveButton,
                  !inputText.trim() && styles.saveButtonDisabled,
                ]}
                onPress={handleSaveCheckIn}
                disabled={!inputText.trim()}>
                <Icon name="check" size={18} color="#fff" />
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
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
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
  },
  avatarWrapper: {
    marginBottom: 12,
  },
  avatarGlow: {
    borderWidth: 3,
    borderRadius: 80,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  checkInButton: {
    backgroundColor: '#6c5ce7',
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  checkInButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
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
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2d3436',
  },
  closeButton: {
    padding: 4,
  },
  miniAvatarSection: {
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 12,
    backgroundColor: '#F8F7FF',
    borderRadius: 12,
  },
  miniMoodText: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
    fontWeight: '500',
  },
  checkInInput: {
    backgroundColor: '#F8F7FF',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#2d3436',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8E6F5',
    minHeight: 100,
  },
  moodIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F8F7FF',
    borderRadius: 10,
    marginBottom: 16,
  },
  moodIndicatorLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  moodIndicatorBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  moodIndicatorText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 11,
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

export default MoodTwin;
