import React, {useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle} from 'react';
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Svg, {Path, Rect, SvgXml} from 'react-native-svg';
import DoodleCanvas, { pointsToPath } from './DoodleCanvas';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

// ─── Static fallback prompts per vibe ────────────────────────────────────────

const FALLBACK_PROMPTS = {
  calm: [
    'What helped you arrive at this stillness?',
    'What are you grateful for right now?',
    'How can you protect this feeling today?',
  ],
  happy: [
    'What specifically made today feel good?',
    'Who would you like to share this joy with?',
    'What does happiness feel like in your body right now?',
  ],
  energetic: [
    'What are you most excited to tackle today?',
    'How can you channel this energy productively?',
    'What does this surge feel like — where is it coming from?',
  ],
  sad: [
    'What is this sadness trying to tell you?',
    'Is there something you need to let go of?',
    'What small act of kindness can you offer yourself right now?',
  ],
  anxious: [
    "What's one thing you can control right now?",
    'What would you say to a friend feeling this way?',
    'Name 3 things you can see from where you are.',
  ],
  angry: [
    "What need of yours isn't being met?",
    'What would help you feel heard?',
    'What boundary might need to be set or reasserted?',
  ],
  lonely: [
    'What kind of connection are you craving?',
    'Who in your life could you reach out to today?',
    'What does your ideal sense of belonging look like?',
  ],
  nostalgic: [
    'What from your past are you longing for?',
    'How has that experience shaped who you are?',
    'What part of that past self can you honor today?',
  ],
  pensive: [
    'What question keeps coming back to you lately?',
    'What are you trying to figure out?',
    'What would happen if you sat with the uncertainty a little longer?',
  ],
  gloomy: [
    'When did this cloudiness begin?',
    'What would a small ray of light look like for you today?',
    "Is there something heavy you've been carrying alone?",
  ],
  tense: [
    'What is the source of this tension?',
    'What would release feel like right now?',
    "What's one thing you can let go of today?",
  ],
  hopeful: [
    'What are you hoping for?',
    "What's one step toward that hope you can take today?",
    "What feels possible that didn't before?",
  ],
  cozy: [
    'What makes this moment feel safe and warm?',
    'How can you savour this feeling a little longer?',
    'Who or what created this sense of comfort?',
  ],
  chaotic: [
    'What is the core thing overwhelming you right now?',
    "What's one thing you can remove from your plate?",
    'What does your mind need most — rest, clarity, or movement?',
  ],
  default: [
    "What's on your mind right now?",
    'How does your body feel in this moment?',
    'What do you need most right now — and how could you give it to yourself?',
  ],
};

const DOODLE_PROMPTS = [
  "Draw how your breath feels right now",
  "Doodle a symbol for your biggest hope",
  "What does 'peace' look like in lines?",
  "Sketch a small gift for your future self",
  "Draw your mood as a weather pattern",
  "Doodle a safe space for your thoughts",
  "Trace a pattern that feels grounding",
];

const getStaticPrompts = vibe => {
  const key = vibe?.toLowerCase() ?? 'default';
  return FALLBACK_PROMPTS[key] ?? FALLBACK_PROMPTS.default;
};

// ─── Answer Popup Modal ───────────────────────────────────────────────────────

const AnswerModal = ({visible, prompt, existingAnswer, onClose, onSave, accentColor}) => {
  const [text, setText] = useState(existingAnswer || '');
  const [showDoodle, setShowDoodle] = useState(false);
  const [savedDoodle, setSavedDoodle] = useState(null);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setText(existingAnswer || '');
      Animated.parallel([
        Animated.spring(slideAnim, {toValue: 0, tension: 55, friction: 10, useNativeDriver: true}),
        Animated.timing(overlayAnim, {toValue: 1, duration: 300, useNativeDriver: true}),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {toValue: SCREEN_HEIGHT, duration: 280, useNativeDriver: true}),
        Animated.timing(overlayAnim, {toValue: 0, duration: 250, useNativeDriver: true}),
      ]).start();
    }
  }, [visible]);

  const handleSave = () => {
    if (!text.trim() && !savedDoodle) return;
    onSave({text: text.trim(), doodle: savedDoodle});
    onClose();
  };

  const handleDoodleSave = doodleData => {
    setSavedDoodle(doodleData);
  };

  const color = accentColor || '#6c5ce7';

  return (
    <>
      <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex: 1}}>
          <Animated.View style={[answerStyles.overlay, {opacity: overlayAnim}]}>
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
          </Animated.View>
          <Animated.View style={[answerStyles.sheet, {transform: [{translateY: slideAnim}]}]}>
            {/* Handle */}
            <View style={answerStyles.handle} />

            {/* Prompt question */}
            <View style={[answerStyles.promptBubble, {borderLeftColor: color}]}>
              <Icon name="format-quote-open" size={14} color={color} style={{marginBottom: 4}} />
              <Text style={answerStyles.promptText}>{prompt}</Text>
            </View>

            {/* Text answer area */}
            <View style={answerStyles.inputWrapper}>
              <TextInput
                style={answerStyles.textInput}
                placeholder="Write your thoughts here…"
                placeholderTextColor="#bbb"
                value={text}
                onChangeText={setText}
                multiline
                autoFocus
                textAlignVertical="top"
                maxLength={1000}
              />
              <Text style={answerStyles.charCount}>{text.length}/1000</Text>
            </View>

            {/* Doodle attachment indicator */}
            {savedDoodle && (
              <TouchableOpacity
                style={[answerStyles.doodleBadge, {borderColor: color + '40', backgroundColor: color + '08'}]}
                onPress={() => setShowDoodle(true)}>
                <Icon name="draw" size={14} color={color} />
                <Text style={[answerStyles.doodleBadgeText, {color}]}>Doodle attached · tap to edit</Text>
                <TouchableOpacity onPress={() => setSavedDoodle(null)} hitSlop={{top: 8, right: 8, bottom: 8, left: 8}}>
                  <Icon name="close-circle" size={14} color="#bbb" />
                </TouchableOpacity>
              </TouchableOpacity>
            )}

            {/* Actions */}
            <View style={answerStyles.actions}>
              <TouchableOpacity
                style={[answerStyles.doodleBtn, {borderColor: color + '40', backgroundColor: color + '08'}]}
                onPress={() => setShowDoodle(true)}>
                <Icon name="draw" size={16} color={color} />
                <Text style={[answerStyles.doodleBtnText, {color}]}>
                  {savedDoodle ? 'Edit Doodle' : 'Add Doodle'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[answerStyles.saveBtn, {backgroundColor: color}, (!text.trim() && !savedDoodle) && answerStyles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={!text.trim() && !savedDoodle}>
                <Icon name="check" size={16} color="#fff" />
                <Text style={answerStyles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Doodle canvas opened from answer modal */}
      <DoodleCanvas
        visible={showDoodle}
        onClose={() => setShowDoodle(false)}
        onSave={handleDoodleSave}
        accentColor={color}
      />
    </>
  );
};

// ─── Saved Answer Card ────────────────────────────────────────────────────────

const SavedAnswerCard = ({prompt, answer, index, color, onEdit, onDelete}) => {
  const [expanded, setExpanded] = useState(false);
  const heightAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    const toVal = expanded ? 0 : 1;
    setExpanded(!expanded);
    Animated.parallel([
      Animated.spring(heightAnim, {toValue: toVal, tension: 60, friction: 10, useNativeDriver: false}),
      Animated.timing(rotateAnim, {toValue: toVal, duration: 200, useNativeDriver: false}),
    ]).start();
  };

  const rotate = rotateAnim.interpolate({inputRange: [0, 1], outputRange: ['0deg', '180deg']});

  return (
    <View style={[savedStyles.card, {borderLeftColor: color}]}>
      <TouchableOpacity style={savedStyles.cardHeader} onPress={toggle} activeOpacity={0.8}>
        <View style={[savedStyles.indexBadge, {backgroundColor: color + '18'}]}>
          <Text style={[savedStyles.indexText, {color}]}>{index + 1}</Text>
        </View>
        <Text style={savedStyles.promptSnippet} numberOfLines={expanded ? undefined : 1}>{prompt}</Text>
        <Animated.View style={{transform: [{rotate}]}}>
          <Icon name="chevron-down" size={16} color="#ccc" />
        </Animated.View>
      </TouchableOpacity>

      <Animated.View style={{
        maxHeight: heightAnim.interpolate({inputRange: [0, 1], outputRange: [0, 300]}),
        overflow: 'hidden',
        opacity: heightAnim,
      }}>
        <View style={savedStyles.answerBody}>
          {answer.text ? (
            <Text style={savedStyles.answerText}>{answer.text}</Text>
          ) : null}
          {answer.doodle && (
            <View style={savedStyles.doodlePreview}>
              <Svg width="100%" height={80} style={{backgroundColor: answer.doodle.bgColor || '#fffdf7', borderRadius: 8}}>
                {(answer.doodle.paths || []).slice(0, 50).map(path => {
                  if (!path.points || path.points.length < 2) return null;
                  // Scale down paths to fit preview
                  const scaleX = (SCREEN_WIDTH - 80) / (SCREEN_WIDTH - 32);
                  const scaleY = 80 / 280;
                  const scaledPoints = path.points.map(p => ({x: p.x * scaleX, y: p.y * scaleY}));
                  const d = pointsToPath(scaledPoints);

                  const d_mirrored = path.mirrored ? (() => {
                    const scaledMirrorX = (path.mirrorX || 0) * scaleX;
                    const mirroredScaledPoints = scaledPoints.map(p => ({x: scaledMirrorX * 2 - p.x, y: p.y}));
                    return pointsToPath(mirroredScaledPoints);
                  })() : null;

                  return (
                    <React.Fragment key={path.id}>
                      <Path d={d} stroke={path.color} strokeWidth={path.size * 0.5}
                        strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      {d_mirrored && (
                        <Path d={d_mirrored} stroke={path.color} strokeWidth={path.size * 0.5}
                          strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      )}
                    </React.Fragment>
                  );
                })}
              </Svg>
              <Text style={savedStyles.doodleLabel}>🎨 Doodle</Text>
            </View>
          )}
          <View style={savedStyles.cardActions}>
            <TouchableOpacity style={savedStyles.editAction} onPress={() => onEdit(index)}>
              <Icon name="pencil-outline" size={13} color="#888" />
              <Text style={savedStyles.editActionText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={savedStyles.deleteAction} onPress={() => onDelete(index)}>
              <Icon name="trash-can-outline" size={13} color="#e74c3c" />
              <Text style={savedStyles.deleteActionText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

// ─── Prompt Chip ─────────────────────────────────────────────────────────────

const PromptChip = ({text, index, color, onOpenAnswer, hasAnswer}) => {
  const slideAnim = useRef(new Animated.Value(20)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 55,
        friction: 9,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 350,
        delay: index * 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, slideAnim, opacityAnim]);

  return (
    <Animated.View style={{opacity: opacityAnim, transform: [{translateY: slideAnim}]}}>
      <TouchableOpacity
        style={[
          styles.promptChip,
          hasAnswer && {backgroundColor: (color || '#6c5ce7') + '08', borderColor: (color || '#6c5ce7') + '30'},
        ]}
        onPress={() => onOpenAnswer(index)}
        activeOpacity={0.75}>
        <View style={styles.promptChipRow}>
          <View style={[styles.promptIndex, {backgroundColor: (color || '#6c5ce7') + '20'}]}>
            <Text style={[styles.promptIndexText, {color: color || '#6c5ce7'}]}>{index + 1}</Text>
          </View>
          <Text style={styles.promptText}>{text}</Text>
          {hasAnswer ? (
            <View style={[styles.answeredBadge, {backgroundColor: (color || '#6c5ce7') + '18'}]}>
              <Icon name="check" size={10} color={color || '#6c5ce7'} />
            </View>
          ) : (
            <Icon name="pencil-outline" size={15} color="#ccc" />
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const JournalPrompts = forwardRef(({vibe, description, token, backendUrl, accentColor, savedReflection, savedDoodles, onJournalChange}, ref) => {
  const [prompts, setPrompts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [source, setSource] = useState('static');
  const [collapsed, setCollapsed] = useState(false);

  // Answer state
  const [answers, setAnswers] = useState({}); // { [promptIndex]: { text, doodle } }
  const [answerModal, setAnswerModal] = useState({visible: false, index: null});
  const [showDoodleStandalone, setShowDoodleStandalone] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const [doodlePrompt, setDoodlePrompt] = useState(DOODLE_PROMPTS[0]);

  const color = accentColor || '#6c5ce7';

  // Parse saved doodles if string
  const parsedSavedDoodles = (() => {
    if (!savedDoodles) return null;
    try {
      return typeof savedDoodles === 'string' ? JSON.parse(savedDoodles) : savedDoodles;
    } catch {
      return null;
    }
  })();

  const pointsToPath = points => {
    if (!points || points.length === 0) return '';
    if (points.length === 1) {
      return `M ${points[0].x} ${points[0].y} L ${points[0].x + 0.1} ${points[0].y}`;
    }
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`;
    }
    return d;
  };

  const savedDoodleList = Array.isArray(parsedSavedDoodles)
    ? parsedSavedDoodles
    : parsedSavedDoodles
    ? [parsedSavedDoodles]
    : [];

  // Expose answers via ref for parent to access
  useImperativeHandle(ref, () => ({
    getAnswers: () => answers,
    clearAnswers: () => setAnswers({}),
  }), [answers]);

  // Fetch prompts
  useEffect(() => {
    if (!vibe) {
      setPrompts([]);
      return;
    }
    setPrompts(getStaticPrompts(vibe));
    setSource('static');
    setCollapsed(false);
    // Reset answers when vibe changes
    setAnswers({});
    setShowAnswers(false);
    setDoodlePrompt(DOODLE_PROMPTS[Math.floor(Math.random() * DOODLE_PROMPTS.length)]);

    if (!backendUrl || !token || !description) return;

    let cancelled = false;
    const fetchAIPrompts = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${backendUrl}/journal-prompts`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json', Authorization: `Bearer ${token}`},
          body: JSON.stringify({vibe, description}),
        });
        if (!response.ok) throw new Error('AI prompts failed');
        const data = await response.json();
        if (!cancelled && Array.isArray(data.prompts) && data.prompts.length > 0) {
          setPrompts(data.prompts.slice(0, 3));
          setSource('ai');
        }
      } catch {
        // Keep static silently
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchAIPrompts();
    return () => {cancelled = true;};
  }, [vibe, description, backendUrl, token]);

  const answeredCount = Object.keys(answers).length;

  const handleOpenAnswer = index => {
    setAnswerModal({visible: true, index});
  };

  const handleSaveAnswer = useCallback(answer => {
    const {index} = answerModal;
    if (index === null) return;
    setAnswers(prev => {
      const next = {...prev, [index]: answer};
      onJournalChange && onJournalChange(next);
      return next;
    });
    setShowAnswers(true);
  }, [answerModal, onJournalChange]);

  const handleDeleteAnswer = index => {
    setAnswers(prev => {
      const next = {...prev};
      delete next[index];
      onJournalChange && onJournalChange(next);
      return next;
    });
  };

  if (!vibe || (prompts.length === 0 && !savedReflection && savedDoodleList.length === 0)) return null;

  const hasSavedData = answeredCount === 0 && (savedReflection || savedDoodleList.length > 0);

  return (
    <View style={[styles.container, {borderColor: color + '30'}]}>
      {/* Header */}
      <TouchableOpacity style={styles.header} onPress={() => setCollapsed(c => !c)} activeOpacity={0.75}>
        <View style={[styles.iconWrap, {backgroundColor: color + '18'}]}>
          <Icon name="pen" size={16} color={color} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>
            {hasSavedData ? 'Saved Reflections' : 'Reflect on this moment'}
          </Text>
          <Text style={styles.headerSub}>
            {hasSavedData ? 'From this mood entry' : source === 'ai' ? '✦ Personalized prompts' : 'Journal prompts'}
            {isLoading ? ' · personalizing…' : ''}
            {answeredCount > 0 ? ` · ${answeredCount}/${prompts.length} answered` : ''}
          </Text>
        </View>
        <Icon name={collapsed ? 'chevron-down' : 'chevron-up'} size={17} color="#bbb" />
      </TouchableOpacity>

      {/* Saved Reflection */}
      {!collapsed && hasSavedData && (
        <View style={styles.savedDataSection}>
          {savedReflection && (
            <View style={styles.savedReflection}>
              <Text style={styles.savedReflectionText}>{savedReflection}</Text>
            </View>
          )}
          {savedDoodleList.map((savedDoodle, doodleIndex) => (
            <View key={doodleIndex} style={styles.savedDoodle}>
              <Svg width="100%" height="120" viewBox="0 0 200 120">
                <Rect width="200" height="120" fill={savedDoodle.bgColor || '#fffdf7'} />
                {savedDoodle.paths?.map((path, idx) => {
                  const d = pointsToPath(path.points);
                  const d_mirrored = path.mirrored ? pointsToPath(path.points.map(p => ({x: (path.mirrorX || 0) * 2 - p.x, y: p.y}))) : null;
                  return (
                    <React.Fragment key={idx}>
                      <Path
                        d={d}
                        stroke={path.color}
                        strokeWidth={path.size}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                      {d_mirrored && (
                        <Path
                          d={d_mirrored}
                          stroke={path.color}
                          strokeWidth={path.size}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </Svg>
              <Text style={styles.doodleLabel}>
                Saved Doodle{savedDoodleList.length > 1 ? ` ${doodleIndex + 1}` : ''}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Prompts */}
      {!collapsed && !hasSavedData && prompts.map((prompt, i) => (
        <PromptChip
          key={`${vibe}-${i}`}
          text={prompt}
          index={i}
          color={color}
          onOpenAnswer={handleOpenAnswer}
          hasAnswer={!!answers[i]}
        />
      ))}

      {/* Doodle standalone button */}
      {!collapsed && (
         <View style={styles.doodleCard}>
           <Text style={styles.doodleCardTitle}>Doodle of the Day</Text>
           <Text style={styles.doodleCardPrompt}>"{doodlePrompt}"</Text>
           <TouchableOpacity
             style={[styles.doodleCardButton, {backgroundColor: color}]}
             onPress={() => setShowDoodleStandalone(true)}
             activeOpacity={0.8}>
             <Icon name="draw" size={16} color="#fff" />
             <Text style={styles.doodleCardButtonText}>Start Doodling</Text>
           </TouchableOpacity>
         </View>
      )}

      {/* Saved answers section */}
      {answeredCount > 0 && !collapsed && (
        <View style={styles.savedSection}>
          <TouchableOpacity
            style={[styles.savedHeader, {backgroundColor: color + '08'}]}
            onPress={() => setShowAnswers(s => !s)}
            activeOpacity={0.8}>
            <Icon name="book-open-variant" size={14} color={color} />
            <Text style={[styles.savedHeaderText, {color}]}>
              {answeredCount} saved reflection{answeredCount !== 1 ? 's' : ''}
            </Text>
            <Icon name={showAnswers ? 'chevron-up' : 'chevron-down'} size={14} color={color + '88'} />
          </TouchableOpacity>

          {showAnswers && (
            <View style={styles.savedList}>
              {Object.entries(answers).map(([idxStr, answer]) => {
                const idx = parseInt(idxStr, 10);
                return (
                  <SavedAnswerCard
                    key={idx}
                    prompt={prompts[idx]}
                    answer={answer}
                    index={idx}
                    color={color}
                    onEdit={i => setAnswerModal({visible: true, index: i})}
                    onDelete={handleDeleteAnswer}
                  />
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* Answer Modal */}
      <AnswerModal
        visible={answerModal.visible}
        prompt={prompts[answerModal.index] || ''}
        existingAnswer={answerModal.index !== null ? answers[answerModal.index]?.text : ''}
        onClose={() => setAnswerModal({visible: false, index: null})}
        onSave={handleSaveAnswer}
        accentColor={color}
      />

      {/* Standalone Doodle Canvas */}
      <DoodleCanvas
        visible={showDoodleStandalone}
        onClose={() => setShowDoodleStandalone(false)}
        onSave={doodleData => {
          // Save standalone doodle under a special key
          setAnswers(prev => {
            const next = {...prev, doodle_standalone: {text: '', doodle: doodleData}};
            onJournalChange && onJournalChange(next);
            return next;
          });
          setShowAnswers(true);
        }}
        accentColor={color}
      />
    </View>
  );
});

JournalPrompts.displayName = 'JournalPrompts';

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  headerTitle: {fontSize: 14, fontWeight: '800', color: '#2d3436', letterSpacing: -0.2},
  headerSub: {fontSize: 11, color: '#aaa', fontWeight: '600', marginTop: 1},
  promptChip: {
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#fcfcff',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  promptChipRow: {flexDirection: 'row', alignItems: 'center', gap: 10},
  promptIndex: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promptIndexText: {fontSize: 11, fontWeight: '800'},
  promptText: {flex: 1, fontSize: 13, color: '#444', lineHeight: 19, fontStyle: 'italic'},
  answeredBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doodleCard: {
    marginTop: 8,
    backgroundColor: '#f8f7ff',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e8e6f5',
    gap: 8,
  },
  doodleCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#aaa',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  doodleCardPrompt: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  doodleCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 18,
    marginTop: 4,
  },
  doodleCardButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  savedSection: {marginTop: 4, gap: 8},
  savedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
  },
  savedHeaderText: {flex: 1, fontSize: 13, fontWeight: '700'},
  savedList: {gap: 8},
  savedDataSection: {gap: 12},
  savedReflection: {
    backgroundColor: '#fafafa',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  savedReflectionText: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
  },
  savedDoodle: {
    backgroundColor: '#fafafa',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    alignItems: 'center',
  },
  doodleLabel: {
    fontSize: 12,
    color: '#888',
    fontWeight: '600',
    marginTop: 8,
  },
});

const answerStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    minHeight: 420,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -4},
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 18,
  },
  promptBubble: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    marginBottom: 16,
  },
  promptText: {fontSize: 15, color: '#2d3436', lineHeight: 22, fontStyle: 'italic', fontWeight: '500'},
  inputWrapper: {
    backgroundColor: '#fafafa',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee',
    padding: 14,
    marginBottom: 12,
    minHeight: 140,
  },
  textInput: {
    fontSize: 15,
    color: '#2d3436',
    lineHeight: 22,
    minHeight: 110,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 10,
    color: '#ccc',
    textAlign: 'right',
    marginTop: 6,
    fontWeight: '600',
  },
  doodleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
    marginBottom: 12,
  },
  doodleBadgeText: {flex: 1, fontSize: 12, fontWeight: '600'},
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  doodleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
  },
  doodleBtnText: {fontSize: 14, fontWeight: '700'},
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    paddingVertical: 12,
  },
  saveBtnDisabled: {opacity: 0.4},
  saveBtnText: {color: '#fff', fontSize: 14, fontWeight: '700'},
});

const doodleStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  sheet: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerLeft: {flexDirection: 'row', alignItems: 'center', gap: 10},
  headerIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {fontSize: 15, fontWeight: '800', color: '#2d3436'},
  headerSub: {fontSize: 11, color: '#aaa', fontWeight: '600'},
  closeBtn: {padding: 6},
  toolbar: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    gap: 8,
  },
  colorScroll: {flexDirection: 'row'},
  colorDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    marginRight: 8,
    borderColor: '#ddd',
  },
  sizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sizeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sizeDot: {},
  activeTool: {backgroundColor: '#6c5ce720'},
  bgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  bgLabel: {fontSize: 11, color: '#aaa', fontWeight: '700', marginRight: 2},
  bgDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  canvas: {
    width: '100%',
    height: 280,
    position: 'relative',
  },
  canvasHint: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  canvasHintText: {fontSize: 13, color: '#ccc', fontWeight: '600'},
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
  },
  actionText: {fontSize: 13, fontWeight: '600', color: '#666'},
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    paddingVertical: 10,
  },
  saveBtnText: {color: '#fff', fontSize: 14, fontWeight: '700'},
  stickerScroll: {
    maxHeight: 60,
    paddingVertical: 4,
  },
  stickerRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    gap: 8,
  },
  stickerBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f8f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e8e8f0',
  },
  stickerWrapper: {
    position: 'absolute',
    width: 60,
    height: 60,
  },
  stickerActive: {
    borderWidth: 2,
    borderColor: '#6c5ce7',
    borderRadius: 8,
  },
  stickerDelete: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  stickerResizeHandle: {
    position: 'absolute',
    bottom: -10,
    right: -10,
    backgroundColor: '#fff',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#6c5ce7',
  },
});

const savedStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fafafa',
    borderRadius: 14,
    borderLeftWidth: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  indexBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  indexText: {fontSize: 11, fontWeight: '800'},
  promptSnippet: {flex: 1, fontSize: 13, color: '#555', fontStyle: 'italic'},
  answerBody: {padding: 12, paddingTop: 0, gap: 10},
  answerText: {fontSize: 14, color: '#2d3436', lineHeight: 21},
  doodlePreview: {gap: 4},
  doodleLabel: {fontSize: 11, color: '#aaa', fontWeight: '600'},
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 4,
  },
  editAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  editActionText: {fontSize: 12, color: '#888', fontWeight: '600'},
  deleteAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: '#fff0f0',
    borderRadius: 8,
  },
  deleteActionText: {fontSize: 12, color: '#e74c3c', fontWeight: '600'},
});

export default JournalPrompts;
