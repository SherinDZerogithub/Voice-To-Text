import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  TextInput,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import Svg, {
  Circle,
  Ellipse,
  Path,
  Rect,
  Defs,
  RadialGradient,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const {width} = Dimensions.get('window');

const MOOD_KEYWORDS = {
  happy:   ['happy', 'great', 'wonderful', 'amazing', 'excited', 'joyful', 'love', 'fantastic', 'blessed', 'grateful'],
  sad:     ['sad', 'down', 'depressed', 'unhappy', 'blue', 'terrible', 'cry', 'lonely', 'heartbroken', 'empty'],
  calm:    ['calm', 'peaceful', 'relaxed', 'serene', 'tranquil', 'still', 'okay', 'fine', 'chill'],
  anxious: ['anxious', 'worried', 'nervous', 'stressed', 'tense', 'afraid', 'panic', 'overwhelmed', 'scared'],
  hopeful: ['hopeful', 'optimistic', 'inspired', 'motivated', 'positive', 'excited', 'looking forward'],
  tired:   ['tired', 'exhausted', 'drained', 'sleepy', 'fatigued', 'burnout', 'worn out'],
  angry:   ['angry', 'frustrated', 'annoyed', 'upset', 'mad', 'furious', 'irritated'],
};

const MOOD_CONFIG = {
  happy:   {color: '#FFD93D', bgColor: '#FFFDE7', expression: 'smile',   emoji: '😊', label: 'Happy',   breathingMsg: null,    affirmation: "Your happiness is contagious ✨"},
  sad:     {color: '#95B8D1', bgColor: '#EBF4FB', expression: 'sad',     emoji: '💙', label: 'Sad',     breathingMsg: "Let's breathe together 🌊", affirmation: "It's okay to feel this way. You're not alone 💙"},
  calm:    {color: '#6BCB77', bgColor: '#F0FBF1', expression: 'peaceful', emoji: '🧘', label: 'Calm',   breathingMsg: null,    affirmation: "This peace you've found is yours to keep 🌿"},
  anxious: {color: '#FF8C69', bgColor: '#FFF3EE', expression: 'worried', emoji: '🫂', label: 'Anxious', breathingMsg: "4-7-8 breathing can help 🌬️", affirmation: "You've handled hard things before. You've got this 💪"},
  hopeful: {color: '#FFE66D', bgColor: '#FFFDE0', expression: 'smile',   emoji: '🌟', label: 'Hopeful', breathingMsg: null,    affirmation: "That hope you feel? It means something 🌟"},
  tired:   {color: '#D4A574', bgColor: '#FDF6EE', expression: 'tired',   emoji: '😴', label: 'Tired',   breathingMsg: "Rest is productive too 🌙", affirmation: "Rest is not giving up, it's fueling up 🌙"},
  angry:   {color: '#FF6B6B', bgColor: '#FFF0F0', expression: 'angry',   emoji: '💢', label: 'Angry',   breathingMsg: "Try box breathing: 4 in, 4 hold, 4 out 📦", affirmation: "Your feelings are valid. Let's work through this 🔥"},
  neutral: {color: '#6c5ce7', bgColor: '#F8F7FF', expression: 'neutral', emoji: '👋', label: 'Neutral', breathingMsg: null,    affirmation: "Every check-in counts. Thanks for showing up 💜"},
};

const QUICK_PROMPTS = [
  {text: "I'm feeling good today", mood: 'happy'},
  {text: "Feeling a bit anxious", mood: 'anxious'},
  {text: "Just tired and drained", mood: 'tired'},
  {text: "I feel calm and at peace", mood: 'calm'},
];

const detectMood = text => {
  const lower = text.toLowerCase();
  for (const [mood, keywords] of Object.entries(MOOD_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) return mood;
  }
  return 'neutral';
};

// ── Avatar SVG ──────────────────────────────────────────────────────────────
const Avatar = ({expression, color, size = 110}) => {
  const cfg = {
    smile:   {eyeY: 42, mouthD: 'M 38 58 Q 50 68 62 58', blush: true,  pupilD: 0},
    sad:     {eyeY: 46, mouthD: 'M 38 64 Q 50 56 62 64', blush: false, pupilD: 2},
    peaceful:{eyeY: 43, mouthD: 'M 40 60 Q 50 65 60 60', blush: true,  pupilD: 0},
    worried: {eyeY: 40, mouthD: 'M 40 62 Q 50 60 60 62', blush: false, pupilD: 1},
    tired:   {eyeY: 46, mouthD: 'M 40 62 Q 50 64 60 62', blush: false, pupilD: 3},
    angry:   {eyeY: 40, mouthD: 'M 38 64 Q 50 56 62 64', blush: false, pupilD: 1},
    neutral: {eyeY: 43, mouthD: 'M 40 60 Q 50 62 60 60', blush: false, pupilD: 0},
  };
  const c = cfg[expression] || cfg.neutral;
  const eyeClose = c.pupilD > 1;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="faceGrad" cx="40%" cy="35%" r="65%">
          <Stop offset="0%" stopColor="#fff" stopOpacity="0.35" />
          <Stop offset="100%" stopColor={color} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="glowBg" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <Stop offset="100%" stopColor={color} stopOpacity="0.04" />
        </RadialGradient>
      </Defs>

      {/* Soft glow background */}
      <Circle cx="50" cy="50" r="46" fill="url(#glowBg)" />

      {/* Head */}
      <Circle cx="50" cy="50" r="34" fill={color} />
      <Circle cx="50" cy="50" r="34" fill="url(#faceGrad)" />

      {/* Eyes */}
      {eyeClose ? (
        <>
          <Path d="M 33 43 Q 38 40 43 43" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <Path d="M 57 43 Q 62 40 67 43" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <Circle cx="38" cy={c.eyeY} r="5.5" fill="#fff" />
          <Circle cx="62" cy={c.eyeY} r="5.5" fill="#fff" />
          <Circle cx={38 + (c.pupilD === 1 ? -1 : 0)} cy={c.eyeY + 1} r="3" fill="#2d3436" />
          <Circle cx={62 + (c.pupilD === 1 ? 1 : 0)} cy={c.eyeY + 1} r="3" fill="#2d3436" />
          {/* Shine */}
          <Circle cx="39.5" cy={c.eyeY - 1} r="1" fill="#fff" opacity="0.9" />
          <Circle cx="63.5" cy={c.eyeY - 1} r="1" fill="#fff" opacity="0.9" />
        </>
      )}

      {/* Mouth */}
      <Path d={c.mouthD} stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />

      {/* Blush */}
      {c.blush && (
        <>
          <Ellipse cx="24" cy="56" rx="7" ry="4.5" fill={color} opacity="0.5" />
          <Ellipse cx="76" cy="56" rx="7" ry="4.5" fill={color} opacity="0.5" />
        </>
      )}

      {/* Eyebrows for angry/worried */}
      {expression === 'angry' && (
        <>
          <Path d="M 32 36 Q 40 32 45 35" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <Path d="M 55 35 Q 60 32 68 36" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      )}
      {expression === 'worried' && (
        <>
          <Path d="M 33 37 Q 38 34 43 37" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.8" />
          <Path d="M 57 37 Q 62 34 67 37" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.8" />
        </>
      )}
    </Svg>
  );
};

// ── Breathing Exercise ────────────────────────────────────────────────────────
const BreathingExercise = ({color, onDone}) => {
  const [phase, setPhase] = useState('inhale'); // inhale | hold | exhale
  const [count, setCount] = useState(4);
  const [cycles, setCycles] = useState(0);
  const circleAnim = useRef(new Animated.Value(0.6)).current;
  const intervalRef = useRef(null);

  const PHASES = {inhale: {label: 'Breathe In', next: 'hold', dur: 4}, hold: {label: 'Hold', next: 'exhale', dur: 7}, exhale: {label: 'Breathe Out', next: 'inhale', dur: 8}};

  useEffect(() => {
    const p = PHASES[phase];
    setCount(p.dur);

    Animated.timing(circleAnim, {
      toValue: phase === 'inhale' ? 1 : phase === 'hold' ? 1 : 0.6,
      duration: p.dur * 1000,
      useNativeDriver: true,
    }).start();

    let c = p.dur;
    intervalRef.current = setInterval(() => {
      c -= 1;
      setCount(c);
      if (c <= 0) {
        clearInterval(intervalRef.current);
        if (phase === 'exhale') setCycles(prev => prev + 1);
        setPhase(p.next);
      }
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [phase]);

  useEffect(() => {
    if (cycles >= 3) {
      onDone?.();
    }
  }, [cycles]);

  const scale = circleAnim.interpolate({inputRange: [0.6, 1], outputRange: [0.6, 1]});

  return (
    <View style={breathStyles.container}>
      <Text style={[breathStyles.phaseLabel, {color}]}>{PHASES[phase].label}</Text>
      <Animated.View style={[breathStyles.circle, {borderColor: color, transform: [{scale}]}]}>
        <Text style={[breathStyles.countText, {color}]}>{count}</Text>
      </Animated.View>
      <Text style={breathStyles.cycleText}>{cycles}/3 cycles</Text>
      <TouchableOpacity onPress={onDone} style={[breathStyles.skipBtn, {borderColor: color}]}>
        <Text style={[breathStyles.skipText, {color}]}>Done</Text>
      </TouchableOpacity>
    </View>
  );
};

const breathStyles = StyleSheet.create({
  container: {alignItems: 'center', paddingVertical: 20, gap: 12},
  phaseLabel: {fontSize: 18, fontWeight: '700'},
  circle: {width: 120, height: 120, borderRadius: 60, borderWidth: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(108,92,231,0.05)'},
  countText: {fontSize: 36, fontWeight: '900'},
  cycleText: {fontSize: 12, color: '#aaa', fontWeight: '600'},
  skipBtn: {paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1.5, marginTop: 4},
  skipText: {fontWeight: '700', fontSize: 13},
});

// ── Main Component ────────────────────────────────────────────────────────────
const MoodTwin = ({onCheckIn, onTabChange, token, backendUrl}) => {
  const [showModal, setShowModal] = useState(false);
  const [inputText, setInputText] = useState('');
  const [detectedMood, setDetectedMood] = useState('neutral');
  const [lastSavedMood, setLastSavedMood] = useState('neutral'); // persists after modal close
  const [step, setStep] = useState('input'); // 'input' | 'breathing' | 'response'
  const [aiResponse, setAiResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recentCheckIns, setRecentCheckIns] = useState([]);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.3)).current;

  // Card uses lastSavedMood; modal uses live detectedMood
  const cfg = MOOD_CONFIG[lastSavedMood] || MOOD_CONFIG.neutral;
  const modalCfg = MOOD_CONFIG[detectedMood] || MOOD_CONFIG.neutral;

  // Idle pulse animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {toValue: 1.06, duration: 2000, useNativeDriver: true}),
        Animated.timing(pulseAnim, {toValue: 1, duration: 2000, useNativeDriver: true}),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Glow animation when saved mood changes (card)
  useEffect(() => {
    Animated.sequence([
      Animated.timing(glowOpacity, {toValue: 0.8, duration: 400, useNativeDriver: true}),
      Animated.timing(glowOpacity, {toValue: 0.3, duration: 800, useNativeDriver: true}),
    ]).start();
    Animated.sequence([
      Animated.spring(scaleAnim, {toValue: 1.08, friction: 5, tension: 80, useNativeDriver: true}),
      Animated.spring(scaleAnim, {toValue: 1, friction: 5, tension: 80, useNativeDriver: true}),
    ]).start();
  }, [lastSavedMood]);

  const handleTextChange = text => {
    setInputText(text);
    setDetectedMood(detectMood(text));
  };

  const handleQuickPrompt = prompt => {
    setInputText(prompt.text);
    setDetectedMood(prompt.mood);
  };

  const fetchAIResponse = async (text, mood) => {
    const moodCfgLocal = MOOD_CONFIG[mood] || MOOD_CONFIG.neutral;
    if (!backendUrl || !token) {
      return `${moodCfgLocal.affirmation} You shared: "${text.slice(0, 60)}${text.length > 60 ? '...' : ''}"`;
    }
    try {
      const res = await fetch(`${backendUrl}/reframe`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', Authorization: `Bearer ${token}`},
        body: JSON.stringify({text, mood}),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      return data.reframe || data.message || moodCfgLocal.affirmation;
    } catch {
      return moodCfgLocal.affirmation;
    }
  };

  const handleSaveCheckIn = async () => {
    if (!inputText.trim()) return;

    const mood = detectedMood;
    const moodCfg = MOOD_CONFIG[mood] || MOOD_CONFIG.neutral;

    // Persist the mood to the card
    setLastSavedMood(mood);

    // Save immediately
    onCheckIn?.({response: inputText, mood, timestamp: new Date().toISOString()});

    // Show breathing for anxious/sad/angry
    if (['sad', 'anxious', 'angry'].includes(mood)) {
      setStep('breathing');
    } else {
      setStep('response');
      setIsLoading(true);
      const reply = await fetchAIResponse(inputText, mood);
      setAiResponse(reply);
      setIsLoading(false);
    }

    // Track recent check-ins
    setRecentCheckIns(prev => [{text: inputText, mood, time: new Date().toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'}), cfg: moodCfg}, ...prev.slice(0, 2)]);
  };

  const handleBreathingDone = async () => {
    setStep('response');
    setIsLoading(true);
    const reply = await fetchAIResponse(inputText, detectedMood);
    setAiResponse(reply);
    setIsLoading(false);
  };

  const handleClose = () => {
    setShowModal(false);
    setInputText('');
    setDetectedMood(lastSavedMood); // revert live mood to last saved, not neutral
    setStep('input');
    setAiResponse('');
  };

  return (
    <View style={[styles.container, {backgroundColor: cfg.bgColor}]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerIcon, {backgroundColor: cfg.color + '25'}]}>
          <Text style={{fontSize: 16}}>{cfg.emoji}</Text>
        </View>
        <View style={{flex: 1}}>
          <Text style={styles.title}>Mood Twin</Text>
          <Text style={styles.subtitle}>How are you feeling right now?</Text>
        </View>
        {recentCheckIns.length > 0 && (
          <View style={[styles.streakDot, {backgroundColor: cfg.color}]}>
            <Text style={styles.streakDotText}>{recentCheckIns.length}</Text>
          </View>
        )}
      </View>

      {/* Avatar display */}
      <View style={styles.avatarSection}>
        <Animated.View style={[styles.glowRing, {borderColor: cfg.color, opacity: glowOpacity}]} />
        <Animated.View style={{transform: [{scale: Animated.multiply(scaleAnim, pulseAnim)}]}}>
          <Avatar expression={cfg.expression} color={cfg.color} size={110} />
        </Animated.View>
        <View style={[styles.moodBadge, {backgroundColor: cfg.color}]}>
          <Text style={styles.moodBadgeText}>{cfg.emoji} {cfg.label}</Text>
        </View>
        <Text style={styles.affirmationText}>{cfg.affirmation}</Text>
      </View>

      {/* Quick prompts */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.promptsScroll} contentContainerStyle={styles.promptsRow}>
        {QUICK_PROMPTS.map((p, i) => (
          <TouchableOpacity key={i} style={[styles.promptChip, {borderColor: MOOD_CONFIG[p.mood].color + '80', backgroundColor: MOOD_CONFIG[p.mood].color + '15'}]} onPress={() => {handleQuickPrompt(p); setShowModal(true);}}>
            <Text style={[styles.promptChipText, {color: MOOD_CONFIG[p.mood].color}]}>{p.text}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* CTA */}
      <TouchableOpacity style={[styles.checkInButton, {backgroundColor: cfg.color}]} onPress={() => setShowModal(true)} activeOpacity={0.8}>
        <Icon name="chat-processing-outline" size={18} color="#fff" />
        <Text style={styles.checkInButtonText}>Check In with Twin</Text>
      </TouchableOpacity>

      {/* Recent check-ins */}
      {recentCheckIns.length > 0 && (
        <View style={styles.recentRow}>
          {recentCheckIns.map((ci, i) => (
            <View key={i} style={[styles.recentChip, {borderColor: ci.cfg.color + '60'}]}>
              <Text style={styles.recentEmoji}>{ci.cfg.emoji}</Text>
              <Text style={styles.recentTime}>{ci.time}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={handleClose}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {step === 'input' ? "What's on your mind?" : step === 'breathing' ? "Let's calm down together" : "Your Twin responds 💜"}
              </Text>
              <TouchableOpacity onPress={handleClose} hitSlop={{top: 8, right: 8, bottom: 8, left: 8}}>
                <Icon name="close" size={22} color="#888" />
              </TouchableOpacity>
            </View>

            {step === 'input' && (
              <>
                {/* Mini avatar */}
                <View style={[styles.miniAvatarWrap, {backgroundColor: modalCfg.bgColor}]}>
                  <Avatar expression={modalCfg.expression} color={modalCfg.color} size={80} />
                  <View style={{flex: 1, gap: 4}}>
                    <Text style={[styles.miniMoodLabel, {color: modalCfg.color}]}>{modalCfg.emoji} Sensing: {modalCfg.label}</Text>
                    {modalCfg.breathingMsg && <Text style={styles.miniHint}>{modalCfg.breathingMsg}</Text>}
                  </View>
                </View>

                {/* Text input */}
                <TextInput
                  style={[styles.checkInInput, {borderColor: modalCfg.color + '50'}]}
                  placeholder="Tell me how you're feeling..."
                  placeholderTextColor="#bbb"
                  multiline
                  numberOfLines={4}
                  value={inputText}
                  onChangeText={handleTextChange}
                  textAlignVertical="top"
                  autoFocus
                />

                {/* Quick prompts inside modal */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 16}} contentContainerStyle={{gap: 8, paddingHorizontal: 2}}>
                  {QUICK_PROMPTS.map((p, i) => (
                    <TouchableOpacity key={i} style={[styles.promptChip, {borderColor: MOOD_CONFIG[p.mood].color + '80', backgroundColor: MOOD_CONFIG[p.mood].color + '15'}]} onPress={() => handleQuickPrompt(p)}>
                      <Text style={[styles.promptChipText, {color: MOOD_CONFIG[p.mood].color}]}>{p.text}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={styles.buttonRow}>
                  <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveButton, {backgroundColor: modalCfg.color}, !inputText.trim() && styles.saveButtonDisabled]}
                    onPress={handleSaveCheckIn}
                    disabled={!inputText.trim()}>
                    <Icon name="send" size={16} color="#fff" />
                    <Text style={styles.saveButtonText}>Share</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {step === 'breathing' && (
              <>
                <View style={[styles.miniAvatarWrap, {backgroundColor: modalCfg.bgColor, justifyContent: 'center'}]}>
                  <Avatar expression={modalCfg.expression} color={modalCfg.color} size={80} />
                </View>
                <BreathingExercise color={modalCfg.color} onDone={handleBreathingDone} />
              </>
            )}

            {step === 'response' && (
              <View style={styles.responseSection}>
                <Avatar expression={modalCfg.expression} color={modalCfg.color} size={90} />
                <View style={[styles.responseBubble, {backgroundColor: modalCfg.bgColor, borderColor: modalCfg.color + '40'}]}>
                  {isLoading ? (
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                      <ActivityIndicator size="small" color={modalCfg.color} />
                      <Text style={{color: '#888', fontSize: 13}}>Your twin is thinking…</Text>
                    </View>
                  ) : (
                    <Text style={[styles.responseText, {color: '#333'}]}>{aiResponse}</Text>
                  )}
                </View>
                <TouchableOpacity style={[styles.doneButton, {backgroundColor: modalCfg.color}]} onPress={handleClose}>
                  <Text style={styles.doneButtonText}>💜 Done</Text>
                </TouchableOpacity>
                {['sad', 'anxious', 'angry'].includes(detectedMood) && (
                  <TouchableOpacity style={styles.chatLink} onPress={() => {handleClose(); onTabChange?.('chat');}}>
                    <Text style={[styles.chatLinkText, {color: modalCfg.color}]}>Talk to therapist →</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 18,
    borderRadius: 20,
    marginVertical: 10,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1a1a2e',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
    marginTop: 1,
  },
  streakDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakDotText: {color: '#fff', fontWeight: '800', fontSize: 11},
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 16,
    marginBottom: 14,
    gap: 8,
    position: 'relative',
  },
  glowRing: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 2,
    top: 12,
  },
  moodBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  moodBadgeText: {color: '#fff', fontWeight: '700', fontSize: 13},
  affirmationText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 16,
    lineHeight: 17,
  },
  promptsScroll: {marginBottom: 12},
  promptsRow: {gap: 8, paddingHorizontal: 2},
  promptChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  promptChipText: {fontSize: 12, fontWeight: '600'},
  checkInButton: {
    paddingVertical: 13,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  checkInButtonText: {color: '#fff', fontWeight: '700', fontSize: 15},
  recentRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    justifyContent: 'center',
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  recentEmoji: {fontSize: 14},
  recentTime: {fontSize: 10, color: '#888', fontWeight: '600'},
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
    maxHeight: '92%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {fontSize: 18, fontWeight: '800', color: '#1a1a2e'},
  miniAvatarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  miniMoodLabel: {fontSize: 14, fontWeight: '700'},
  miniHint: {fontSize: 12, color: '#888'},
  checkInInput: {
    backgroundColor: '#F8F7FF',
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: '#2d3436',
    marginBottom: 12,
    borderWidth: 2,
    minHeight: 110,
    lineHeight: 21,
  },
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
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonDisabled: {backgroundColor: '#ddd'},
  saveButtonText: {color: '#fff', fontWeight: '700', fontSize: 14},
  responseSection: {alignItems: 'center', gap: 16},
  responseBubble: {
    width: '100%',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
  },
  responseText: {fontSize: 15, lineHeight: 24, fontWeight: '500'},
  doneButton: {
    paddingVertical: 13,
    paddingHorizontal: 40,
    borderRadius: 25,
  },
  doneButtonText: {color: '#fff', fontWeight: '700', fontSize: 15},
  chatLink: {paddingVertical: 4},
  chatLinkText: {fontWeight: '700', fontSize: 13},
});

export default MoodTwin;