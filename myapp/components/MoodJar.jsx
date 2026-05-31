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
import Svg, {
  G,
  Path,
  Circle,
  Rect,
  Polygon,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const GEM_COLORS = [
  '#FF6B6B', // Red
  '#FFD93D', // Yellow
  '#6BCB77', // Green
  '#4D96FF', // Blue
  '#FF8FB1', // Pink
  '#9D84B7', // Purple
  '#FF9F43', // Orange
];

const MoodJar = ({onGemAdded, onJarFull}) => {
  const [gems, setGems] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [gratitudeText, setGratitudeText] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  const [jarFillLevel, setJarFillLevel] = useState(0);

  const jarAnim = useRef(new Animated.Value(0)).current;
  const celebrationAnim = useRef(new Animated.Value(0)).current;
  const gemAnimRefs = useRef([]);

  // Calculate jar fill level
  useEffect(() => {
    const level = Math.min((gems.length / 7) * 100, 100);
    setJarFillLevel(level);

    if (gems.length === 7) {
      triggerCelebration();
      onJarFull?.({gems, timestamp: new Date().toISOString()});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gems, gems.length, onJarFull]);

  const triggerCelebration = () => {
    celebrationAnim.setValue(0);
    Animated.sequence([
      Animated.spring(celebrationAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(celebrationAnim, {
        toValue: 0,
        duration: 2000,
        useNativeDriver: true,
      }),
    ]).start();
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 2500);
  };

  const handleAddGem = () => {
    if (gratitudeText.trim() && gems.length < 7) {
      const newGem = {
        id: Date.now(),
        text: gratitudeText,
        color: GEM_COLORS[gems.length % GEM_COLORS.length],
        timestamp: new Date().toISOString(),
      };

      setGems([...gems, newGem]);
      onGemAdded?.(newGem);
      setGratitudeText('');
      setShowAddModal(false);

      // Animate jar shake
      Animated.sequence([
        Animated.spring(jarAnim, {
          toValue: 1,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(jarAnim, {
          toValue: 0,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const handleReleaseWorry = () => {
    if (gems.length > 0) {
      const updatedGems = gems.slice(0, -1);
      setGems(updatedGems);
    }
  };

  const Gem = ({gem, index}) => {
    const gemAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.sequence([
        Animated.delay(index * 100),
        Animated.spring(gemAnim, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }, [gemAnim, index]);

    // Calculate position in jar
    const row = Math.floor(index / 3);
    const col = index % 3;
    const x = 50 + col * 35 - 35;
    const y = 120 - row * 35;

    return (
      <Animated.View
        key={gem.id}
        style={[
          styles.gemContainer,
          {
            left: x,
            top: y,
            transform: [{scale: gemAnim}],
          },
        ]}>
        <Svg width="30" height="30" viewBox="0 0 30 30">
          <Polygon
            points="15,2 25,10 25,20 15,28 5,20 5,10"
            fill={gem.color}
            stroke={gem.color}
            strokeWidth="0.5"
            opacity="0.9"
          />
          <Polygon points="15,2 25,10 20,15" fill="#fff" opacity="0.4" />
        </Svg>
      </Animated.View>
    );
  };

  const JarVisualization = () => {
    const fillHeight = (jarFillLevel / 100) * 80;

    return (
      <Animated.View
        style={[
          styles.jarWrapper,
          {
            transform: [
              {
                rotateZ: jarAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '5deg'],
                }),
              },
            ],
          },
        ]}>
        <Svg width="140" height="180" viewBox="0 0 100 150">
          <Defs>
            <LinearGradient id="jarGrad" x1="0" y1="0" x2="100" y2="150">
              <Stop offset="0%" stopColor="#F5F5F5" />
              <Stop offset="100%" stopColor="#E8E8E8" />
            </LinearGradient>
            <LinearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#FFD93D" stopOpacity="0.3" />
              <Stop offset="100%" stopColor="#FFD93D" stopOpacity="0.6" />
            </LinearGradient>
          </Defs>

          {/* Jar body */}
          <Path
            d="M 25 20 L 20 40 L 20 110 Q 20 130 40 135 L 60 135 Q 80 130 80 110 L 80 40 L 75 20 Z"
            fill="url(#jarGrad)"
            stroke="#999"
            strokeWidth="1"
          />

          {/* Jar lid */}
          <Rect x="30" y="10" width="40" height="12" rx="2" fill="#999" />
          <Rect x="28" y="8" width="44" height="4" rx="1" fill="#BBB" />

          {/* Fill level */}
          <Path
            d={`M 22 ${
              110 - fillHeight
            } L 22 110 Q 22 128 40 133 L 60 133 Q 78 128 78 110 L 78 ${
              110 - fillHeight
            } Z`}
            fill="url(#fillGrad)"
          />

          {/* Shine effect */}
          <Path
            d="M 30 40 Q 35 60 32 90"
            stroke="#fff"
            strokeWidth="2"
            fill="none"
            opacity="0.5"
          />
        </Svg>

        {/* Gems inside jar */}
        <View style={styles.gemsContainer}>
          {gems.map((gem, idx) => (
            <Gem key={gem.id} gem={gem} index={idx} />
          ))}
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon name="bottle-wine" size={24} color="#FFD93D" />
        <Text style={styles.title}>Gratitude Jar</Text>
        <Text style={styles.subtitle}>{gems.length}/7 gems</Text>
      </View>

      <View style={styles.jarSection}>
        <JarVisualization />

        {showCelebration && (
          <Animated.View
            style={[
              styles.celebrationBadge,
              {
                opacity: celebrationAnim,
                transform: [{scale: celebrationAnim}],
              },
            ]}>
            <Text style={styles.celebrationText}>🎉 Jar Full!</Text>
          </Animated.View>
        )}
      </View>

      <View style={styles.fillBar}>
        <View style={[styles.fillBarInner, {width: `${jarFillLevel}%`}]} />
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            gems.length >= 7 && styles.actionButtonDisabled,
          ]}
          onPress={() => setShowAddModal(true)}
          disabled={gems.length >= 7}>
          <Icon
            name="plus"
            size={18}
            color={gems.length >= 7 ? '#ccc' : '#6c5ce7'}
          />
          <Text
            style={[
              styles.actionButtonText,
              gems.length >= 7 && styles.actionButtonTextDisabled,
            ]}>
            Add Gratitude
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.releaseButton,
            gems.length === 0 && styles.actionButtonDisabled,
          ]}
          onPress={handleReleaseWorry}
          disabled={gems.length === 0}>
          <Icon
            name="cloud-outline"
            size={18}
            color={gems.length === 0 ? '#ccc' : '#95B8D1'}
          />
          <Text
            style={[
              styles.actionButtonText,
              styles.releaseButtonText,
              gems.length === 0 && styles.actionButtonTextDisabled,
            ]}>
            Release Worry
          </Text>
        </TouchableOpacity>
      </View>

      {/* Recent Gems */}
      {gems.length > 0 && (
        <View style={styles.recentSection}>
          <Text style={styles.recentTitle}>Recent Gratitudes</Text>
          <ScrollView
            style={styles.recentScroll}
            showsVerticalScrollIndicator={false}>
            {gems.map(gem => (
              <View
                key={gem.id}
                style={[styles.gemCard, {borderLeftColor: gem.color}]}>
                <Text style={styles.gemText} numberOfLines={2}>
                  {gem.text}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Add Gratitude Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add a Gratitude</Text>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                style={styles.closeButton}>
                <Icon name="close" size={24} color="#2d3436" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              What are you grateful for today?
            </Text>

            <TextInput
              style={styles.gratitudeInput}
              placeholder="Write something you're grateful for..."
              placeholderTextColor="#ccc"
              multiline
              numberOfLines={4}
              value={gratitudeText}
              onChangeText={setGratitudeText}
              textAlignVertical="top"
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.saveButton,
                  !gratitudeText.trim() && styles.saveButtonDisabled,
                ]}
                onPress={handleAddGem}
                disabled={!gratitudeText.trim()}>
                <Icon name="plus" size={18} color="#fff" />
                <Text style={styles.saveButtonText}>Add Gem</Text>
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
    marginBottom: 16,
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
  jarSection: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    position: 'relative',
  },
  jarWrapper: {
    alignItems: 'center',
  },
  gemsContainer: {
    position: 'absolute',
    width: 140,
    height: 180,
    top: 0,
    left: 0,
  },
  gemContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  celebrationBadge: {
    position: 'absolute',
    top: 20,
    backgroundColor: '#FFD93D',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  celebrationText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2d3436',
  },
  fillBar: {
    height: 8,
    backgroundColor: '#E8E6F5',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  fillBarInner: {
    height: '100%',
    backgroundColor: '#FFD93D',
    borderRadius: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#6c5ce7',
  },
  releaseButton: {
    borderColor: '#95B8D1',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    color: '#6c5ce7',
    fontWeight: '600',
    fontSize: 13,
  },
  releaseButtonText: {
    color: '#95B8D1',
  },
  actionButtonTextDisabled: {
    color: '#ccc',
  },
  recentSection: {
    maxHeight: 200,
  },
  recentTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
  },
  recentScroll: {
    maxHeight: 150,
  },
  gemCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
  },
  gemText: {
    fontSize: 12,
    color: '#555',
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
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2d3436',
  },
  closeButton: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
  },
  gratitudeInput: {
    backgroundColor: '#F8F7FF',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#2d3436',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E8E6F5',
    minHeight: 100,
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

export default MoodJar;
