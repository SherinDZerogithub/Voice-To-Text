import React, {useRef, useState} from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  Polygon,
  Stop,
} from 'react-native-svg';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const {width} = Dimensions.get('window');

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_GEMS = 10; // more satisfying than 7

const GEM_COLORS = [
  {fill: '#FF6B6B', light: '#FFE5E5', label: 'Ruby'},
  {fill: '#FFD93D', light: '#FFF9D6', label: 'Topaz'},
  {fill: '#6BCB77', light: '#E8F8EA', label: 'Emerald'},
  {fill: '#4D96FF', light: '#E3EEFF', label: 'Sapphire'},
  {fill: '#FF8FB1', light: '#FFE8EF', label: 'Rose'},
  {fill: '#9D84B7', light: '#EDE8F5', label: 'Amethyst'},
  {fill: '#FF9F43', light: '#FFF0DC', label: 'Amber'},
  {fill: '#00CEC9', light: '#DCF9F8', label: 'Aqua'},
  {fill: '#A29BFE', light: '#EEEEFF', label: 'Lavender'},
  {fill: '#FD79A8', light: '#FFE4F0', label: 'Coral'},
];

const GRATITUDE_PROMPTS = [
  "Something that made me smile today…",
  "A person I'm grateful for…",
  "A small win I had today…",
  "Something beautiful I noticed…",
  "A moment of kindness I witnessed or gave…",
];

const FULL_JAR_MESSAGES = [
  "✨ Your jar is overflowing with good things!",
  "🎉 Look how much you have to be grateful for!",
  "💫 A full jar of beautiful moments!",
];

// ── Gem SVG ───────────────────────────────────────────────────────────────────
const GemSVG = ({color, size = 28}) => (
  <Svg width={size} height={size} viewBox="0 0 30 30">
    <Defs>
      <LinearGradient id={`gemGrad_${color.fill}`} x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0%" stopColor="#fff" stopOpacity="0.5" />
        <Stop offset="100%" stopColor={color.fill} stopOpacity="1" />
      </LinearGradient>
    </Defs>
    <Polygon
      points="15,2 26,9 26,21 15,28 4,21 4,9"
      fill={color.fill}
      opacity="0.95"
    />
    <Polygon points="15,2 26,9 20,14" fill="#fff" opacity="0.35" />
    <Polygon points="15,28 4,21 10,16" fill="#000" opacity="0.1" />
  </Svg>
);

// ── Jar Visualization ─────────────────────────────────────────────────────────
const JarVisualization = ({gems, jarAnim, jarFillLevel, gemScaleAnims}) => {
  const fillHeight = (jarFillLevel / 100) * 88;

  return (
    <Animated.View
      style={[
        styles.jarWrapper,
        {
          transform: [
            {
              rotateZ: jarAnim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: ['0deg', '4deg', '0deg'],
              }),
            },
          ],
        },
      ]}>
      <Svg width={160} height={200} viewBox="0 0 100 140">
        <Defs>
          <LinearGradient id="jarBody" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#E8E8F0" stopOpacity="0.9" />
            <Stop offset="50%" stopColor="#F5F5FF" stopOpacity="0.95" />
            <Stop offset="100%" stopColor="#E0E0EE" stopOpacity="0.9" />
          </LinearGradient>
          <LinearGradient id="jarFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#A8E6CF" stopOpacity="0.55" />
            <Stop offset="100%" stopColor="#6BCB77" stopOpacity="0.35" />
          </LinearGradient>
          <LinearGradient id="lidGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#B0B0C0" />
            <Stop offset="100%" stopColor="#888898" />
          </LinearGradient>
        </Defs>

        {/* Jar body */}
        <Path
          d="M 25 22 L 20 38 L 20 108 Q 20 128 50 130 Q 80 128 80 108 L 80 38 L 75 22 Z"
          fill="url(#jarBody)"
          stroke="#C0C0D0"
          strokeWidth="1"
        />

        {/* Fill level */}
        {jarFillLevel > 0 && (
          <Path
            d={`M 22 ${108 - fillHeight} L 22 108 Q 22 126 50 128 Q 78 126 78 108 L 78 ${108 - fillHeight} Z`}
            fill="url(#jarFill)"
          />
        )}

        {/* Shine */}
        <Path
          d="M 30 40 Q 33 65 30 95"
          stroke="#fff"
          strokeWidth="3"
          fill="none"
          opacity="0.45"
          strokeLinecap="round"
        />
        <Path
          d="M 37 36 Q 40 55 38 75"
          stroke="#fff"
          strokeWidth="1.5"
          fill="none"
          opacity="0.25"
          strokeLinecap="round"
        />

        {/* Lid base */}
        <Path d="M 22 22 L 78 22 L 75 28 L 25 28 Z" fill="url(#lidGrad)" />
        {/* Lid cap */}
        <Path d="M 30 16 L 70 16 L 75 22 L 25 22 Z" fill="#A0A0B0" />
        <Path d="M 38 12 L 62 12 L 70 16 L 30 16 Z" fill="#B0B0C0" rx="2" />
        {/* Lid knob */}
        <Ellipse cx="50" cy="11" rx="8" ry="4" fill="#A0A0B0" />
        <Ellipse cx="50" cy="10" rx="6" ry="3" fill="#C0C0D0" />
      </Svg>

      {/* Gems layered on top of jar */}
      <View style={styles.gemsOverlay} pointerEvents="none">
        {gems.map((gem, idx) => {
          const row = Math.floor(idx / 3);
          const col = idx % 3;
          const colOffsets = [-28, 0, 28];
          const left = 67 + colOffsets[col];
          const bottom = 26 + row * 30;
          const scaleAnim = gemScaleAnims[gem.id] || new Animated.Value(1);
          return (
            <Animated.View
              key={gem.id}
              style={[
                styles.gemOverlayItem,
                {
                  left,
                  bottom,
                  transform: [{scale: scaleAnim}],
                },
              ]}>
              <GemSVG color={GEM_COLORS[idx % GEM_COLORS.length]} size={26} />
            </Animated.View>
          );
        })}
      </View>
    </Animated.View>
  );
};

// ── Gem Card ──────────────────────────────────────────────────────────────────
const GemCard = ({gem, onDelete}) => {
  const gemColor = GEM_COLORS[gem.colorIndex % GEM_COLORS.length];
  return (
    <View style={[styles.gemCard, {borderLeftColor: gemColor.fill, backgroundColor: gemColor.light}]}>
      <View style={{flex: 1}}>
        <Text style={styles.gemText}>{gem.text}</Text>
        <Text style={styles.gemTime}>{gem.timeLabel}</Text>
      </View>
      <View style={styles.gemCardRight}>
        <GemSVG color={gemColor} size={22} />
        {onDelete && (
          <TouchableOpacity onPress={() => onDelete(gem.id)} hitSlop={{top: 6, right: 6, bottom: 6, left: 6}}>
            <Icon name="close" size={14} color="#bbb" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const MoodJar = ({gems: controlledGems, onGemAdded, onGemDeleted, onJarFull}) => {
  const [localGems, setLocalGems] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAllModal, setShowAllModal] = useState(false);
  const [gratitudeText, setGratitudeText] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  const [randomPrompt, setRandomPrompt] = useState(GRATITUDE_PROMPTS[0]);
  const [charCount, setCharCount] = useState(0);
  const gems = controlledGems || localGems;
  const isControlled = Array.isArray(controlledGems);

  const jarFillLevel = Math.min((gems.length / MAX_GEMS) * 100, 100);

  const jarAnim = useRef(new Animated.Value(0)).current;
  const celebrationAnim = useRef(new Animated.Value(0)).current;
  const celebrationScale = useRef(new Animated.Value(0)).current;

  const gemScaleAnims = useRef({}).current;

  const pickRandomPrompt = () => {
    const idx = Math.floor(Math.random() * GRATITUDE_PROMPTS.length);
    setRandomPrompt(GRATITUDE_PROMPTS[idx]);
  };

  const animateJar = () => {
    Animated.sequence([
      Animated.timing(jarAnim, {toValue: 1, duration: 200, useNativeDriver: false}),
      Animated.timing(jarAnim, {toValue: 0, duration: 200, useNativeDriver: false}),
    ]).start();
  };

  const triggerCelebration = () => {
    celebrationScale.setValue(0);
    celebrationAnim.setValue(1);
    Animated.parallel([
      Animated.spring(celebrationScale, {toValue: 1, friction: 5, tension: 60, useNativeDriver: false}),
      Animated.sequence([
        Animated.delay(2000),
        Animated.timing(celebrationAnim, {toValue: 0, duration: 500, useNativeDriver: false}),
      ]),
    ]).start(() => setShowCelebration(false));
    setShowCelebration(true);
  };

  const handleAddGem = () => {
    if (!gratitudeText.trim() || gems.length >= MAX_GEMS) return;

    const idx = gems.length;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const color = GEM_COLORS[idx % GEM_COLORS.length].fill;

    // Pre-create the animation BEFORE state update so it exists when overlay renders
    const scaleAnim = new Animated.Value(0);
    gemScaleAnims[id] = scaleAnim;

    const newGem = {
      id,
      text: gratitudeText.trim(),
      colorIndex: idx,
      color,
      timeLabel: new Date().toLocaleDateString('en-US', {month: 'short', day: 'numeric'}),
    };

    const updated = [...gems, newGem];
    if (!isControlled) {
      setLocalGems(updated);
    }
    onGemAdded?.(newGem);
    setGratitudeText('');
    setCharCount(0);
    setShowAddModal(false);
    animateJar();

    // Animate new gem in after a brief delay so layout is ready
    setTimeout(() => {
      Animated.spring(scaleAnim, {toValue: 1, friction: 5, tension: 60, useNativeDriver: true}).start();
    }, 50);

    if (updated.length >= MAX_GEMS) {
      triggerCelebration();
      onJarFull?.({gems: updated, timestamp: new Date().toISOString()});
    }
  };

  const handleDeleteGem = id => {
    delete gemScaleAnims[id];
    if (!isControlled) {
      setLocalGems(prev => prev.filter(g => g.id !== id));
    }
    onGemDeleted?.(id);
  };

  const handleOpenAdd = () => {
    pickRandomPrompt();
    setGratitudeText('');
    setCharCount(0);
    setShowAddModal(true);
  };

  const gemsToShow = gems.slice(-3).reverse(); // show 3 most recent

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.jarIconWrap}>
            <Text style={{fontSize: 22}}>🫙</Text>
          </View>
          <View>
            <Text style={styles.title}>Gratitude Jar</Text>
            <Text style={styles.subtitle}>Collect your little joys</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.gemCount}>{gems.length}/{MAX_GEMS}</Text>
          <Text style={styles.gemCountLabel}>gems</Text>
        </View>
      </View>

      {/* Jar + Fill */}
      <View style={styles.jarSection}>
        <JarVisualization
          gems={gems}
          jarAnim={jarAnim}
          jarFillLevel={jarFillLevel}
          gemScaleAnims={gemScaleAnims}
        />

        {/* Fill bar beside jar */}
        <View style={styles.fillBarVertical}>
          {[...Array(MAX_GEMS)].map((_, i) => (
            <View
              key={i}
              style={[
                styles.fillBarSegment,
                {backgroundColor: i < gems.length ? GEM_COLORS[i % GEM_COLORS.length].fill : '#EEE'},
              ]}
            />
          ))}
          <Text style={styles.fillBarLabel}>{Math.round(jarFillLevel)}%</Text>
        </View>

        {showCelebration && (
          <Animated.View style={[styles.celebrationBadge, {opacity: celebrationAnim, transform: [{scale: celebrationScale}]}]}>
            <Text style={styles.celebrationText}>{FULL_JAR_MESSAGES[gems.length % FULL_JAR_MESSAGES.length]}</Text>
          </Animated.View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.addButton, gems.length >= MAX_GEMS && styles.buttonDisabled]}
          onPress={handleOpenAdd}
          disabled={gems.length >= MAX_GEMS}
          activeOpacity={0.8}>
          <Icon name="plus-circle" size={20} color={gems.length >= MAX_GEMS ? '#ccc' : '#6c5ce7'} />
          <Text style={[styles.addButtonText, gems.length >= MAX_GEMS && {color: '#ccc'}]}>Add Gratitude</Text>
        </TouchableOpacity>

        {gems.length > 0 && (
          <TouchableOpacity style={styles.viewAllButton} onPress={() => setShowAllModal(true)} activeOpacity={0.8}>
            <Icon name="eye-outline" size={18} color="#6BCB77" />
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Recent gems preview */}
      {gemsToShow.length > 0 && (
        <View style={styles.recentSection}>
          <Text style={styles.recentTitle}>Recent gems ✨</Text>
          {gemsToShow.map(gem => (
            <GemCard key={gem.id} gem={gem} onDelete={handleDeleteGem} />
          ))}
          {gems.length > 3 && (
            <TouchableOpacity onPress={() => setShowAllModal(true)}>
              <Text style={styles.moreLink}>+{gems.length - 3} more gems →</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {gems.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🌱</Text>
          <Text style={styles.emptyText}>Your jar is waiting for your first gratitude!</Text>
          <Text style={styles.emptyHint}>Even the smallest things count — a good coffee, a kind word, sunshine through a window.</Text>
        </View>
      )}

      {/* Add Modal */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add a Gratitude Gem</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)} hitSlop={{top: 8, right: 8, bottom: 8, left: 8}}>
                <Icon name="close" size={22} color="#888" />
              </TouchableOpacity>
            </View>

            {/* Prompt suggestion */}
            <TouchableOpacity style={styles.promptBox} onPress={pickRandomPrompt} activeOpacity={0.7}>
              <Icon name="lightbulb-outline" size={15} color="#FFD93D" />
              <Text style={styles.promptBoxText}>{randomPrompt}</Text>
              <Icon name="refresh" size={14} color="#ccc" />
            </TouchableOpacity>

            {/* Color picker preview */}
            <View style={styles.colorPreviewRow}>
              <GemSVG color={GEM_COLORS[gems.length % GEM_COLORS.length]} size={32} />
              <Text style={styles.colorPreviewLabel}>
                {GEM_COLORS[gems.length % GEM_COLORS.length].label} gem #{gems.length + 1}
              </Text>
            </View>

            <TextInput
              style={styles.gratitudeInput}
              placeholder="Write something you're grateful for..."
              placeholderTextColor="#bbb"
              multiline
              numberOfLines={4}
              value={gratitudeText}
              maxLength={200}
              onChangeText={t => {setGratitudeText(t); setCharCount(t.length);}}
              textAlignVertical="top"
              autoFocus
            />
            <Text style={styles.charCount}>{charCount}/200</Text>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, !gratitudeText.trim() && styles.saveButtonDisabled]}
                onPress={handleAddGem}
                disabled={!gratitudeText.trim()}>
                <Text style={styles.saveButtonText}>✨ Add Gem</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* View All Modal */}
      <Modal visible={showAllModal} transparent animationType="slide" onRequestClose={() => setShowAllModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {maxHeight: '85%'}]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Your Gratitude Gems 💎</Text>
                <Text style={styles.modalSubtitle}>{gems.length} beautiful moments collected</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAllModal(false)} hitSlop={{top: 8, right: 8, bottom: 8, left: 8}}>
                <Icon name="close" size={22} color="#888" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{marginBottom: 16}}>
              {gems.slice().reverse().map(gem => (
                <GemCard key={gem.id} gem={gem} onDelete={id => {handleDeleteGem(id);}} />
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.saveButton} onPress={() => setShowAllModal(false)}>
              <Text style={styles.saveButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 18,
    backgroundColor: '#FFFEF8',
    borderRadius: 20,
    marginVertical: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {flexDirection: 'row', alignItems: 'center', gap: 10},
  jarIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#FFF9E6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFD93D40',
  },
  title: {fontSize: 17, fontWeight: '800', color: '#1a1a2e', letterSpacing: -0.3},
  subtitle: {fontSize: 11, color: '#aaa', fontWeight: '500', marginTop: 1},
  headerRight: {alignItems: 'center'},
  gemCount: {fontSize: 22, fontWeight: '900', color: '#FFD93D'},
  gemCountLabel: {fontSize: 10, color: '#aaa', fontWeight: '700', textTransform: 'uppercase'},
  jarSection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 16,
    marginBottom: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 14,
  },
  jarWrapper: {alignItems: 'center', position: 'relative'},
  gemsOverlay: {position: 'absolute', width: 160, height: 200, bottom: 0, left: 0},
  gemOverlayItem: {position: 'absolute'},
  fillBarVertical: {
    width: 22,
    height: 160,
    gap: 4,
    flexDirection: 'column-reverse',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingBottom: 4,
  },
  fillBarSegment: {
    width: 14,
    height: 11,
    borderRadius: 4,
  },
  fillBarLabel: {fontSize: 9, color: '#aaa', fontWeight: '700', marginTop: 4},
  celebrationBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: '#FFD93D',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#FFD93D',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  celebrationText: {fontSize: 13, fontWeight: '800', color: '#3d3200', textAlign: 'center'},
  actionRow: {flexDirection: 'row', gap: 10, marginBottom: 14},
  addButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EDE9FF',
    borderWidth: 1.5,
    borderColor: '#6c5ce730',
  },
  addButtonText: {color: '#6c5ce7', fontWeight: '700', fontSize: 14},
  viewAllButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8F8EA',
    borderWidth: 1.5,
    borderColor: '#6BCB7730',
  },
  viewAllText: {color: '#6BCB77', fontWeight: '700', fontSize: 13},
  buttonDisabled: {opacity: 0.4},
  recentSection: {gap: 8},
  recentTitle: {fontSize: 12, fontWeight: '700', color: '#888', letterSpacing: 0.3},
  gemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 4,
    borderLeftWidth: 4,
    gap: 10,
  },
  gemText: {fontSize: 13, color: '#333', fontWeight: '500', lineHeight: 18},
  gemTime: {fontSize: 10, color: '#aaa', fontWeight: '600', marginTop: 2},
  gemCardRight: {alignItems: 'center', gap: 6},
  moreLink: {fontSize: 12, color: '#6c5ce7', fontWeight: '700', textAlign: 'center', paddingVertical: 4},
  emptyState: {alignItems: 'center', paddingVertical: 16, gap: 8},
  emptyEmoji: {fontSize: 32},
  emptyText: {fontSize: 14, fontWeight: '700', color: '#555', textAlign: 'center'},
  emptyHint: {fontSize: 12, color: '#aaa', textAlign: 'center', lineHeight: 18, paddingHorizontal: 10},
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {fontSize: 18, fontWeight: '800', color: '#1a1a2e'},
  modalSubtitle: {fontSize: 12, color: '#aaa', marginTop: 2},
  promptBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFDE7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FFD93D30',
  },
  promptBoxText: {flex: 1, fontSize: 12, color: '#888', fontStyle: 'italic'},
  colorPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  colorPreviewLabel: {fontSize: 13, fontWeight: '600', color: '#666'},
  gratitudeInput: {
    backgroundColor: '#F8F7FF',
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: '#2d3436',
    borderWidth: 1.5,
    borderColor: '#E8E6F5',
    minHeight: 100,
    lineHeight: 21,
  },
  charCount: {fontSize: 10, color: '#ccc', textAlign: 'right', marginTop: 4, marginBottom: 16, fontWeight: '600'},
  buttonRow: {flexDirection: 'row', gap: 12},
  cancelButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F0EFF8',
  },
  cancelButtonText: {color: '#6c5ce7', fontWeight: '700', fontSize: 14},
  saveButton: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#6c5ce7',
  },
  saveButtonDisabled: {backgroundColor: '#ddd'},
  saveButtonText: {color: '#fff', fontWeight: '700', fontSize: 14},
});

export default MoodJar;
