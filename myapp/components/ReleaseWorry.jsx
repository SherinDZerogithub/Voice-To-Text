import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Animated,
  Easing,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const {width} = Dimensions.get('window');

// ── Constants ─────────────────────────────────────────────────────────────────
const RELEASE_PROMPTS = [
  "A worry that's been following me…",
  "Something I can't control but keeps spinning in my mind…",
  "A fear I'm ready to let go of…",
  "Something I've been holding onto too tightly…",
  "A 'what if' that's been draining my energy…",
];

const RELEASE_AFFIRMATIONS = [
  'Released. That worry no longer holds power over you. 🌬️',
  "Let it go. You've done the brave thing. ✨",
  "It's gone. You made space for peace. 🕊️",
  "Exhale. You don't need to carry that anymore. 💨",
  "Released to the universe. You're lighter now. 🌙",
];

const FLAME_COLORS = [
  {outer: '#FF6B35', inner: '#FFD93D', glow: '#FF6B3540'},
  {outer: '#FF4D6D', inner: '#FF8FA3', glow: '#FF4D6D40'},
  {outer: '#7B2FBE', inner: '#C77DFF', glow: '#7B2FBE40'},
  {outer: '#0077B6', inner: '#90E0EF', glow: '#0077B640'},
];

// ── Smoke Particle ─────────────────────────────────────────────────────────────
const SmokeParticle = ({color, delay, startX, onDone}) => {
  const y = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.3)).current;
  const x = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const drift = (Math.random() - 0.5) * 40;
    const animation = Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(y, {
          toValue: -120,
          duration: 1800,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(x, {
          toValue: drift,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 2.5,
          duration: 1800,
          useNativeDriver: true,
        }),
      ]),
    ]);
    animation.start(({finished}) => {
      if (finished) {
        onDone?.();
      }
    });
    return () => animation.stop();
  }, [delay, onDone, opacity, scale, x, y]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: 60,
        left: startX - 15,
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: color,
        opacity,
        transform: [{translateY: y}, {translateX: x}, {scale}],
      }}
    />
  );
};

// ── Flame SVG ─────────────────────────────────────────────────────────────────
const FlameSVG = ({colors, flickerAnim, size = 80}) => (
  <Animated.View
    style={{
      transform: [
        {
          scaleX: flickerAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.92, 1.08],
          }),
        },
      ],
    }}>
    <Svg width={size} height={size * 1.3} viewBox="0 0 60 80">
      <Defs>
        <RadialGradient id="flameGlow" cx="50%" cy="80%" r="50%">
          <Stop offset="0%" stopColor={colors.outer} stopOpacity="0.4" />
          <Stop offset="100%" stopColor={colors.outer} stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id="flameBody" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={colors.inner} stopOpacity="0.9" />
          <Stop offset="60%" stopColor={colors.outer} stopOpacity="1" />
          <Stop offset="100%" stopColor={colors.outer} stopOpacity="0.8" />
        </LinearGradient>
        <LinearGradient id="flameCore" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
          <Stop offset="100%" stopColor={colors.inner} stopOpacity="0.7" />
        </LinearGradient>
      </Defs>
      {/* Glow base */}
      <Ellipse cx="30" cy="70" rx="22" ry="8" fill="url(#flameGlow)" />
      {/* Outer flame */}
      <Path
        d="M 30 4 C 20 16, 8 28, 10 46 C 12 60, 20 72, 30 72 C 40 72, 48 60, 50 46 C 52 28, 40 16, 30 4 Z"
        fill="url(#flameBody)"
      />
      {/* Inner flame */}
      <Path
        d="M 30 18 C 24 27, 18 36, 20 48 C 22 58, 26 66, 30 66 C 34 66, 38 58, 40 48 C 42 36, 36 27, 30 18 Z"
        fill="url(#flameCore)"
        opacity="0.8"
      />
      {/* Tiny bright tip */}
      <Ellipse cx="30" cy="14" rx="4" ry="6" fill="#fff" opacity="0.6" />
    </Svg>
  </Animated.View>
);

// ── Paper burning animation ────────────────────────────────────────────────────
const BurningPaper = ({text, colors, onComplete}) => {
  const burnProgress = useRef(new Animated.Value(0)).current;
  const paperOpacity = useRef(new Animated.Value(1)).current;
  const paperScale = useRef(new Animated.Value(1)).current;
  const onCompleteRef = useRef(onComplete);
  const hasCompletedRef = useRef(false);
  const [particles, setParticles] = useState([]);
  const [showAffirmation, setShowAffirmation] = useState(false);
  const affirmAnim = useRef(new Animated.Value(0)).current;
  const affirmScale = useRef(new Animated.Value(0.7)).current;

  const affirmation = useRef(
    RELEASE_AFFIRMATIONS[
      Math.floor(Math.random() * RELEASE_AFFIRMATIONS.length)
    ],
  ).current;

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    let isMounted = true;
    hasCompletedRef.current = false;

    // Create smoke particles
    const newParticles = Array.from({length: 8}, (_, i) => ({
      id: i,
      delay: i * 150,
      startX: 30 + (Math.random() - 0.5) * 20,
      done: false,
    }));
    setParticles(newParticles);

    const burnSequence = Animated.sequence([
      Animated.delay(400),
      Animated.parallel([
        Animated.timing(burnProgress, {
          toValue: 1,
          duration: 1400,
          easing: Easing.in(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.sequence([
          Animated.delay(600),
          Animated.timing(paperOpacity, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(700),
          Animated.spring(paperScale, {
            toValue: 0.6,
            friction: 4,
            tension: 60,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]);

    burnSequence.start(() => {
      if (!isMounted) {
        return;
      }
      setShowAffirmation(true);
      Animated.parallel([
        Animated.spring(affirmScale, {
          toValue: 1,
          friction: 5,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(affirmAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    });

    const completeTimer = setTimeout(() => {
      if (!isMounted || hasCompletedRef.current) {
        return;
      }
      hasCompletedRef.current = true;
      onCompleteRef.current?.();
    }, 3000);

    return () => {
      isMounted = false;
      burnSequence.stop();
      clearTimeout(completeTimer);
    };
  }, [affirmAnim, affirmScale, burnProgress, paperOpacity, paperScale]);

  const paperScaleY = burnProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  return (
    <View style={burningStyles.container}>
      {/* Flame */}
      <View style={burningStyles.flameArea}>
        {particles.map(p => (
          <SmokeParticle
            key={p.id}
            color={colors.outer + '60'}
            delay={p.delay}
            startX={p.startX}
          />
        ))}
        <FlameSVG colors={colors} flickerAnim={burnProgress} size={90} />
      </View>

      {/* Paper */}
      <Animated.View
        style={[
          burningStyles.paper,
          {
            opacity: paperOpacity,
            transform: [{scale: paperScale}, {scaleY: paperScaleY}],
          },
        ]}>
        <Text style={burningStyles.paperText} numberOfLines={3}>
          {text}
        </Text>
        <View
          style={[burningStyles.burnEdge, {backgroundColor: colors.outer}]}
        />
      </Animated.View>

      {/* Affirmation */}
      {showAffirmation && (
        <Animated.View
          style={[
            burningStyles.affirmation,
            {opacity: affirmAnim, transform: [{scale: affirmScale}]},
          ]}>
          <Text style={burningStyles.affirmText}>{affirmation}</Text>
        </Animated.View>
      )}
    </View>
  );
};

const burningStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 20,
    minHeight: 220,
    justifyContent: 'flex-end',
  },
  flameArea: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 140,
    position: 'relative',
    width: 100,
  },
  paper: {
    width: 180,
    backgroundColor: '#FEFCE8',
    borderRadius: 6,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E3D0',
    overflow: 'hidden',
    marginTop: -10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  paperText: {
    fontSize: 12,
    color: '#555',
    fontStyle: 'italic',
    lineHeight: 18,
    textAlign: 'center',
  },
  burnEdge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 6,
    opacity: 0.6,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  affirmation: {marginTop: 20, paddingHorizontal: 20, alignItems: 'center'},
  affirmText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2d3436',
    textAlign: 'center',
    lineHeight: 24,
  },
});

// ── Worry Card ────────────────────────────────────────────────────────────────
const WorryCard = ({worry, flameColor}) => (
  <View style={[worryCardStyles.card, {borderLeftColor: flameColor}]}>
    <View style={worryCardStyles.smokeIcon}>
      <Text style={{fontSize: 14}}>💨</Text>
    </View>
    <View style={{flex: 1}}>
      <Text style={worryCardStyles.text} numberOfLines={2}>
        {worry.text}
      </Text>
      <Text style={worryCardStyles.time}>{worry.timeLabel} · released</Text>
    </View>
  </View>
);

const worryCardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 10,
    marginBottom: 4,
    borderLeftWidth: 3,
    gap: 10,
  },
  smokeIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {fontSize: 13, color: '#555', lineHeight: 18},
  time: {fontSize: 10, color: '#bbb', fontWeight: '600', marginTop: 2},
});

// ── Main Component ────────────────────────────────────────────────────────────
const ReleaseWorry = ({onWorryReleased}) => {
  const [worries, setWorries] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [worryText, setWorryText] = useState('');
  const [isBurning, setIsBurning] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState(RELEASE_PROMPTS[0]);
  const [currentFlame, setCurrentFlame] = useState(0);
  const [charCount, setCharCount] = useState(0);

  const flickerAnim = useRef(new Animated.Value(0)).current;
  const breatheAnim = useRef(new Animated.Value(1)).current;
  const closeModalTimeout = useRef(null);
  const pendingWorryText = useRef('');
  const burnCompleteHandled = useRef(false);

  // Gentle idle flame flicker
  useEffect(() => {
    const flicker = Animated.loop(
      Animated.sequence([
        Animated.timing(flickerAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(flickerAnim, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    flicker.start();
    return () => flicker.stop();
  }, [flickerAnim]);

  // Breathe animation for the button
  useEffect(() => {
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, {
          toValue: 1.04,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(breatheAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    );
    breathe.start();
    return () => breathe.stop();
  }, [breatheAnim]);

  useEffect(() => {
    return () => {
      if (closeModalTimeout.current) {
        clearTimeout(closeModalTimeout.current);
      }
    };
  }, []);

  const pickRandomPrompt = () => {
    setCurrentPrompt(
      RELEASE_PROMPTS[Math.floor(Math.random() * RELEASE_PROMPTS.length)],
    );
  };

  const handleRelease = () => {
    const trimmedWorry = worryText.trim();
    if (!trimmedWorry || isBurning) {
      return;
    }
    pendingWorryText.current = trimmedWorry;
    burnCompleteHandled.current = false;
    setIsBurning(true);
  };

  const handleBurnComplete = useCallback(() => {
    if (burnCompleteHandled.current) {
      return;
    }

    const releasedText = pendingWorryText.current.trim();
    if (!releasedText) {
      setIsBurning(false);
      setShowAddModal(false);
      return;
    }

    burnCompleteHandled.current = true;
    const flameColors = FLAME_COLORS[currentFlame % FLAME_COLORS.length];
    const newWorry = {
      id: Date.now(),
      text: releasedText,
      timeLabel: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      flameColor: flameColors.outer,
    };
    setWorries(prev => [newWorry, ...prev]);
    onWorryReleased?.(newWorry);
    setWorryText('');
    setCharCount(0);
    setCurrentFlame(prev => prev + 1);
    pendingWorryText.current = '';

    if (closeModalTimeout.current) {
      clearTimeout(closeModalTimeout.current);
    }
    closeModalTimeout.current = setTimeout(() => {
      setIsBurning(false);
      setShowAddModal(false);
    }, 800);
  }, [currentFlame, onWorryReleased]);

  const handleOpenAdd = () => {
    pickRandomPrompt();
    setWorryText('');
    setCharCount(0);
    setIsBurning(false);
    pendingWorryText.current = '';
    burnCompleteHandled.current = false;
    setShowAddModal(true);
  };

  const colors = FLAME_COLORS[currentFlame % FLAME_COLORS.length];
  const recentWorries = worries.slice(0, 3);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconWrap, {backgroundColor: colors.glow}]}>
            <Text style={{fontSize: 20}}>🔥</Text>
          </View>
          <View>
            <Text style={styles.title}>Release Worry</Text>
            <Text style={styles.subtitle}>Write it. Burn it. Let it go.</Text>
          </View>
        </View>
        {worries.length > 0 && (
          <TouchableOpacity onPress={() => setShowHistoryModal(true)}>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{worries.length}</Text>
              <Text style={styles.countLabel}>released</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Flame preview */}
      <View style={styles.flameSection}>
        <View style={styles.flameBg}>
          <FlameSVG colors={colors} flickerAnim={flickerAnim} size={72} />
        </View>
        <View style={styles.flameTextSection}>
          <Text style={styles.flameTitle}>A sacred space to let go</Text>
          <Text style={styles.flameDesc}>
            Name your worry. Watch it burn. Your mind deserves the space back.
          </Text>
          {worries.length > 0 && (
            <View style={[styles.releasedChip, {backgroundColor: colors.glow}]}>
              <Text style={[styles.releasedChipText, {color: colors.outer}]}>
                🕊️ {worries.length} {worries.length === 1 ? 'worry' : 'worries'}{' '}
                released
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* CTA */}
      <Animated.View style={{transform: [{scale: breatheAnim}]}}>
        <TouchableOpacity
          style={[styles.releaseButton, {backgroundColor: colors.outer}]}
          onPress={handleOpenAdd}
          activeOpacity={0.85}>
          <Icon name="fire" size={18} color="#fff" />
          <Text style={styles.releaseButtonText}>Release a Worry</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Recent releases */}
      {recentWorries.length > 0 && (
        <View style={styles.recentSection}>
          <Text style={styles.recentLabel}>Recently released 💨</Text>
          {recentWorries.map(w => (
            <WorryCard key={w.id} worry={w} flameColor={w.flameColor} />
          ))}
          {worries.length > 3 && (
            <TouchableOpacity onPress={() => setShowHistoryModal(true)}>
              <Text style={[styles.moreLink, {color: colors.outer}]}>
                +{worries.length - 3} more released →
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {worries.length === 0 && (
        <View style={styles.emptyHint}>
          <Text style={styles.emptyHintText}>
            💡 Writing worries down and symbolically releasing them reduces
            their mental load. Try it.
          </Text>
        </View>
      )}

      {/* Add Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => !isBurning && setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {!isBurning ? (
              <>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>Name Your Worry</Text>
                    <Text style={styles.modalSubtitle}>
                      Give it a name, then let the fire take it
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowAddModal(false)}
                    hitSlop={{top: 8, right: 8, bottom: 8, left: 8}}>
                    <Icon name="close" size={22} color="#888" />
                  </TouchableOpacity>
                </View>

                {/* Prompt suggestion */}
                <TouchableOpacity
                  style={styles.promptBox}
                  onPress={pickRandomPrompt}
                  activeOpacity={0.7}>
                  <Icon name="fire" size={15} color={colors.outer} />
                  <Text style={styles.promptText}>{currentPrompt}</Text>
                  <Icon name="refresh" size={14} color="#ccc" />
                </TouchableOpacity>

                {/* Preview flame */}
                <View style={styles.modalFlameRow}>
                  <FlameSVG
                    colors={colors}
                    flickerAnim={flickerAnim}
                    size={50}
                  />
                  <Text style={styles.modalFlameHint}>
                    This flame is waiting for your worry
                  </Text>
                </View>

                <TextInput
                  style={[
                    styles.worryInput,
                    {borderColor: colors.outer + '50'},
                  ]}
                  placeholder="Write your worry here..."
                  placeholderTextColor="#bbb"
                  multiline
                  numberOfLines={4}
                  value={worryText}
                  maxLength={300}
                  onChangeText={t => {
                    setWorryText(t);
                    setCharCount(t.length);
                  }}
                  textAlignVertical="top"
                  autoFocus
                />
                <Text style={styles.charCount}>{charCount}/300</Text>

                <Text style={styles.releaseNote}>
                  🔒 This is private. Once released, it's gone.
                </Text>

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setShowAddModal(false)}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.burnButton,
                      {backgroundColor: colors.outer},
                      !worryText.trim() && styles.burnButtonDisabled,
                    ]}
                    onPress={handleRelease}
                    disabled={!worryText.trim()}>
                    <Icon name="fire" size={16} color="#fff" />
                    <Text style={styles.burnButtonText}>Burn & Release</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Releasing…</Text>
                </View>
                <BurningPaper
                  text={worryText}
                  colors={colors}
                  onComplete={handleBurnComplete}
                />
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* History Modal */}
      <Modal
        visible={showHistoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowHistoryModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {maxHeight: '80%'}]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Released Worries 🕊️</Text>
                <Text style={styles.modalSubtitle}>
                  {worries.length} worries set free
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowHistoryModal(false)}
                hitSlop={{top: 8, right: 8, bottom: 8, left: 8}}>
                <Icon name="close" size={22} color="#888" />
              </TouchableOpacity>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{marginBottom: 16}}>
              {worries.map((w, i) => (
                <WorryCard
                  key={w.id}
                  worry={w}
                  flameColor={FLAME_COLORS[i % FLAME_COLORS.length].outer}
                />
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.burnButton, {backgroundColor: '#6c5ce7'}]}
              onPress={() => setShowHistoryModal(false)}>
              <Text style={styles.burnButtonText}>Close</Text>
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
    backgroundColor: '#FFF8F5',
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
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1a1a2e',
    letterSpacing: -0.3,
  },
  subtitle: {fontSize: 11, color: '#aaa', fontWeight: '500', marginTop: 1},
  countBadge: {alignItems: 'center'},
  countText: {fontSize: 22, fontWeight: '900', color: '#FF6B35'},
  countLabel: {
    fontSize: 10,
    color: '#aaa',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  flameSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    gap: 14,
  },
  flameBg: {
    width: 80,
    height: 100,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  flameTextSection: {flex: 1, gap: 6},
  flameTitle: {fontSize: 14, fontWeight: '800', color: '#2d3436'},
  flameDesc: {fontSize: 12, color: '#888', lineHeight: 17},
  releasedChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 2,
  },
  releasedChipText: {fontSize: 11, fontWeight: '700'},
  releaseButton: {
    paddingVertical: 13,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    elevation: 3,
    shadowColor: '#FF6B35',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  releaseButtonText: {color: '#fff', fontWeight: '700', fontSize: 14},
  recentSection: {gap: 6},
  recentLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#888',
    letterSpacing: 0.3,
  },
  moreLink: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 4,
  },
  emptyHint: {
    backgroundColor: 'rgba(255,107,53,0.07)',
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  emptyHintText: {
    fontSize: 12,
    color: '#888',
    lineHeight: 18,
    textAlign: 'center',
  },
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
    backgroundColor: '#FFF3EE',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FF6B3520',
  },
  promptText: {flex: 1, fontSize: 12, color: '#888', fontStyle: 'italic'},
  modalFlameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  modalFlameHint: {
    flex: 1,
    fontSize: 12,
    color: '#aaa',
    fontStyle: 'italic',
    lineHeight: 17,
  },
  worryInput: {
    backgroundColor: '#FFF8F5',
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: '#2d3436',
    borderWidth: 1.5,
    minHeight: 100,
    lineHeight: 21,
  },
  charCount: {
    fontSize: 10,
    color: '#ccc',
    textAlign: 'right',
    marginTop: 4,
    fontWeight: '600',
  },
  releaseNote: {
    fontSize: 11,
    color: '#bbb',
    textAlign: 'center',
    marginVertical: 10,
    fontStyle: 'italic',
  },
  buttonRow: {flexDirection: 'row', gap: 12},
  cancelButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  cancelText: {color: '#888', fontWeight: '700', fontSize: 14},
  burnButton: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  burnButtonDisabled: {backgroundColor: '#ddd'},
  burnButtonText: {color: '#fff', fontWeight: '700', fontSize: 14},
});

export default ReleaseWorry;
