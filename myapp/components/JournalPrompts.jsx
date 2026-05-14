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

const getStaticPrompts = vibe => {
  const key = vibe?.toLowerCase() ?? 'default';
  return FALLBACK_PROMPTS[key] ?? FALLBACK_PROMPTS.default;
};

// ─── Doodle Canvas ───────────────────────────────────────────────────────────

const BRUSH_SIZES = [2, 4, 8, 14, 20];
const BRUSH_COLORS = [
  '#2d3436', '#1A1A2E', '#34495E',
  '#FF6B9D', '#FF8E72', '#FFC75F', '#FF9671',
  '#6C5CE7', '#A55EEA', '#D65DB1', '#845EC2',
  '#00C9A7', '#00D9C0', '#4DC9E6', '#45B7D1',
  '#2ECC71', '#9EE493', '#A8E6CF',
  '#FFD93D', '#F9F871', '#FFE699',
  '#FF6B6B', '#EE5A52', '#FF85A2',
  '#ffffff', '#F5F6FA',
];

const DOODLE_PROMPTS = [
  "Draw how your breath feels right now",
  "Doodle a symbol for your biggest hope",
  "What does 'peace' look like in lines?",
  "Sketch a small gift for your future self",
  "Draw your mood as a weather pattern",
  "Doodle a safe space for your thoughts",
  "Trace a pattern that feels grounding",
  "Draw a messy scribble and turn it into a flower",
  "Illustrate one thing you're grateful for",
  "Create a visual mantra for today",
];

// ─── Sticker SVGs ────────────────────────────────────────────────────────────

const STICKERS = [
  { id: 'heart', name: 'Heart', svg: `<path d="M100,86 C92,78 78,78 70,86 C62,94 62,106 70,114 L100,140 L130,114 C138,106 138,94 130,86 C122,78 108,78 100,86 Z" fill="STROKE"/>` },
  { id: 'star', name: 'Star', svg: `<path d="M100,70 L108,92 L132,92 L114,106 L120,128 L100,116 L80,128 L86,106 L68,92 L92,92 Z" fill="STROKE"/>` },
  { id: 'sun', name: 'Sun', svg: `<circle cx="100" cy="100" r="20" fill="STROKE"/><line x1="100" y1="68" x2="100" y2="52" stroke="STROKE" stroke-width="4" stroke-linecap="round"/><line x1="100" y1="132" x2="100" y2="148" stroke="STROKE" stroke-width="4" stroke-linecap="round"/><line x1="68" y1="100" x2="52" y2="100" stroke="STROKE" stroke-width="4" stroke-linecap="round"/><line x1="132" y1="100" x2="148" y2="100" stroke="STROKE" stroke-width="4" stroke-linecap="round"/><line x1="78" y1="78" x2="66" y2="66" stroke="STROKE" stroke-width="4" stroke-linecap="round"/><line x1="122" y1="122" x2="134" y2="134" stroke="STROKE" stroke-width="4" stroke-linecap="round"/><line x1="78" y1="122" x2="66" y2="134" stroke="STROKE" stroke-width="4" stroke-linecap="round"/><line x1="122" y1="78" x2="134" y2="66" stroke="STROKE" stroke-width="4" stroke-linecap="round"/>` },
  { id: 'moon', name: 'Moon', svg: `<path d="M110,65 C85,68 68,88 68,110 C68,135 88,155 115,155 C125,155 135,150 142,142 C130,148 115,148 102,138 C88,126 85,105 92,88 C96,78 104,70 110,65 Z" fill="STROKE"/>` },
  { id: 'flower', name: 'Flower', svg: `<circle cx="100" cy="100" r="16" fill="STROKE"/><circle cx="100" cy="72" r="14" fill="STROKE" opacity="0.7"/><circle cx="124" cy="86" r="14" fill="STROKE" opacity="0.7"/><circle cx="118" cy="114" r="14" fill="STROKE" opacity="0.7"/><circle cx="82" cy="114" r="14" fill="STROKE" opacity="0.7"/><circle cx="76" cy="86" r="14" fill="STROKE" opacity="0.7"/>` },
  { id: 'sparkle', name: 'Sparkle', svg: `<path d="M100,60 L103,90 L132,100 L103,110 L100,140 L97,110 L68,100 L97,90 Z" fill="STROKE"/>` },
  { id: 'cloud', name: 'Cloud', svg: `<ellipse cx="85" cy="105" rx="28" ry="22" fill="STROKE"/><ellipse cx="115" cy="105" rx="28" ry="22" fill="STROKE"/><ellipse cx="100" cy="90" rx="22" ry="18" fill="STROKE"/>` },
  { id: 'rainbow', name: 'Rainbow', svg: `<path d="M45,120 Q100,50 155,120" stroke="#FF6B6B" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M55,120 Q100,60 145,120" stroke="#FFD93D" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M65,120 Q100,70 135,120" stroke="#9EE493" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M75,120 Q100,80 125,120" stroke="#45B7D1" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M85,120 Q100,90 115,120" stroke="#A55EEA" stroke-width="8" fill="none" stroke-linecap="round"/>` },
  { id: 'butterfly', name: 'Butterfly', svg: `<ellipse cx="75" cy="85" rx="22" ry="28" fill="STROKE"/><ellipse cx="125" cy="85" rx="22" ry="28" fill="STROKE"/><ellipse cx="80" cy="115" rx="16" ry="20" fill="STROKE" opacity="0.7"/><ellipse cx="120" cy="115" rx="16" ry="20" fill="STROKE" opacity="0.7"/><ellipse cx="100" cy="100" rx="6" ry="30" fill="#2d3436"/><line x1="96" y1="68" x2="90" y2="55" stroke="#2d3436" stroke-width="3" stroke-linecap="round"/><line x1="104" y1="68" x2="110" y2="55" stroke="#2d3436" stroke-width="3" stroke-linecap="round"/>` },
  { id: 'music', name: 'Music', svg: `<ellipse cx="82" cy="125" rx="14" ry="10" fill="STROKE"/><ellipse cx="130" cy="115" rx="14" ry="10" fill="STROKE"/><line x1="96" y1="125" x2="96" y2="60" stroke="STROKE" stroke-width="5"/><line x1="144" y1="115" x2="144" y2="50" stroke="STROKE" stroke-width="5"/><path d="M96,60 Q120,50 144,50" stroke="STROKE" stroke-width="5" fill="none"/>` },
  { id: 'leaf', name: 'Leaf', svg: `<path d="M100,145 Q60,120 70,80 Q80,50 100,55 Q120,50 130,80 Q140,120 100,145 Z" fill="STROKE"/><path d="M100,145 Q100,100 100,55" stroke="STROKE" opacity="0.4" stroke-width="3" fill="none"/><path d="M85,90 Q100,85 115,90" stroke="STROKE" opacity="0.4" stroke-width="2" fill="none"/><path d="M80,105 Q100,100 120,105" stroke="STROKE" opacity="0.4" stroke-width="2" fill="none"/>` },
  { id: 'wave', name: 'Wave', svg: `<path d="M50,100 Q70,70 90,100 Q110,130 130,100 Q150,70 170,100" stroke="STROKE" stroke-width="8" fill="none" stroke-linecap="round"/>` },
  { id: 'lightning', name: 'Bolt', svg: `<path d="M110,50 L85,95 L105,95 L90,150 L130,90 L110,90 L125,50 Z" fill="STROKE"/>` },
  { id: 'droplet', name: 'Drop', svg: `<path d="M100,55 C100,55 65,95 65,115 C65,135 80,150 100,150 C120,150 135,135 135,115 C135,95 100,55 100,55 Z" fill="STROKE"/>` },
  { id: 'diamond', name: 'Diamond', svg: `<path d="M100,55 L140,100 L100,145 L60,100 Z" fill="STROKE"/><path d="M100,55 L140,100 L100,100 Z" fill="STROKE" opacity="0.5"/>` },
];

const getStickerXml = (svgContent, color) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">${svgContent.replace(
    /STROKE/g,
    color,
  )}</svg>`;

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

const DoodleCanvas = ({visible, onClose, onSave, accentColor}) => {
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState(null);
  const [brushColor, setBrushColor] = useState('#2d3436');
  const [brushSize, setBrushSize] = useState(4);
  const [isEraser, setIsEraser] = useState(false);
  const [isMirror, setIsMirror] = useState(false);
  const [bgColor, setBgColor] = useState('#fffdf7');
  const [prompt, setPrompt] = useState(DOODLE_PROMPTS[0]);
  const [canvasWidth, setCanvasWidth] = useState(0);
  const [stickers, setStickers] = useState([]); // [{id, x, y, scale, stickerId}]
  const [activeSticker, setActiveSticker] = useState(null);
  const [showStickerPanel, setShowStickerPanel] = useState(false);
  const canvasRef = useRef(null);
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setPrompt(DOODLE_PROMPTS[Math.floor(Math.random() * DOODLE_PROMPTS.length)]);
      Animated.parallel([
        Animated.spring(scaleAnim, {toValue: 1, tension: 60, friction: 10, useNativeDriver: true}),
        Animated.timing(opacityAnim, {toValue: 1, duration: 250, useNativeDriver: true}),
      ]).start();
    } else {
      scaleAnim.setValue(0.92);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: evt => {
        const {locationX, locationY} = evt.nativeEvent;
        const newPath = {
          points: [{x: locationX, y: locationY}],
          color: isEraser ? bgColor : brushColor,
          size: isEraser ? brushSize * 3 : brushSize,
          id: Date.now(),
          mirrored: isMirror,
          mirrorX: canvasWidth / 2,
        };
        setCurrentPath(newPath);
      },
      onPanResponderMove: evt => {
        const {locationX, locationY} = evt.nativeEvent;
        setCurrentPath(prev => {
          if (!prev) return prev;
          return {...prev, points: [...prev.points, {x: locationX, y: locationY}]};
        });
      },
      onPanResponderRelease: () => {
        setCurrentPath(prev => {
          if (prev) {
            setPaths(ps => [...ps, prev]);
          }
          return null;
        });
      },
    }),
  ).current;

  const shufflePrompt = () => setPrompt(DOODLE_PROMPTS[Math.floor(Math.random() * DOODLE_PROMPTS.length)]);

  const handleUndo = () => {
    if (stickers.length > 0 && paths.length === 0) {
      setStickers(prev => prev.slice(0, -1));
    } else {
      setPaths(prev => prev.slice(0, -1));
    }
  };
  const handleClear = () => {
    setPaths([]);
    setStickers([]);
  };

  const handleSave = () => {
    const doodleData = {paths, bgColor, stickers, timestamp: Date.now()};
    onSave && onSave(doodleData);
    onClose();
  };

  const handleAddSticker = stickerId => {
    const newSticker = {
      id: Date.now(),
      stickerId,
      x: canvasWidth / 2 - 40,
      y: 140,
      scale: 1,
      color: brushColor,
    };
    setStickers(prev => [...prev, newSticker]);
    setActiveSticker(newSticker.id);
    setShowStickerPanel(false);
  };

  const handleUpdateSticker = (id, updates) => {
    setStickers(prev => prev.map(s => s.id === id ? {...s, ...updates} : s));
  };

  const handleDeleteSticker = id => {
    setStickers(prev => prev.filter(s => s.id !== id));
    setActiveSticker(null);
  };

  const BG_COLORS = ['#fffdf7', '#f8f0ff', '#e8fff8', '#fff0f5', '#f0f8ff', '#fffbf0', '#f0fff4', '#1a1a2e', '#2C3E50', '#E8E8F5'];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={doodleStyles.overlay}>
        <Animated.View
          style={[doodleStyles.sheet, {opacity: opacityAnim, transform: [{scale: scaleAnim}]}]}>

          {/* Header */}
          <View style={doodleStyles.header}>
            <View style={doodleStyles.headerLeft}>
              <View style={[doodleStyles.headerIcon, {backgroundColor: (accentColor || '#6c5ce7') + '18'}]}>
                <Icon name="draw" size={16} color={accentColor || '#6c5ce7'} />
              </View>
              <View>
                <Text style={doodleStyles.headerTitle}>{prompt}</Text>
                <TouchableOpacity onPress={shufflePrompt}>
                  <Text style={doodleStyles.headerSub}>Tap to shuffle • Express what words can't</Text>
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={doodleStyles.closeBtn}>
              <Icon name="close" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Toolbar */}
          <View style={doodleStyles.toolbar}>
            {/* Color picker */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={doodleStyles.colorScroll}>
              {BRUSH_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  onPress={() => {setIsEraser(false); setBrushColor(c);}}
                  style={[
                    doodleStyles.colorDot,
                    {backgroundColor: c, borderWidth: !isEraser && brushColor === c ? 3 : 1},
                    c === '#ffffff' && {borderColor: '#ddd'},
                  ]}
                />
              ))}
            </ScrollView>

            {/* Brush size */}
            <View style={doodleStyles.sizeRow}>
              {BRUSH_SIZES.map(s => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setBrushSize(s)}
                  style={[doodleStyles.sizeBtn, brushSize === s && !isEraser && {backgroundColor: brushColor + '22'}]}>
                  <View style={[doodleStyles.sizeDot, {
                    width: s + 4,
                    height: s + 4,
                    borderRadius: (s + 4) / 2,
                    backgroundColor: brushColor,
                  }]} />
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => setIsEraser(e => !e)}
                style={[doodleStyles.sizeBtn, isEraser && doodleStyles.activeTool]}>
                <Icon name="eraser" size={16} color={isEraser ? '#6c5ce7' : '#888'} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setIsMirror(m => !m)}
                style={[doodleStyles.sizeBtn, isMirror && doodleStyles.activeTool]}>
                <Icon name="reflect-vertical" size={16} color={isMirror ? '#6c5ce7' : '#888'} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowStickerPanel(s => !s)}
                style={[doodleStyles.sizeBtn, showStickerPanel && doodleStyles.activeTool]}>
                <Icon name="sticker-emoji" size={18} color={showStickerPanel ? '#6c5ce7' : '#888'} />
              </TouchableOpacity>
            </View>

            {/* Sticker panel */}
            {showStickerPanel && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={doodleStyles.stickerScroll}>
                <View style={doodleStyles.stickerRow}>
                  {STICKERS.map(sticker => (
                    <TouchableOpacity
                      key={sticker.id}
                      onPress={() => handleAddSticker(sticker.id)}
                      style={doodleStyles.stickerBtn}>
                      <SvgXml
                        xml={getStickerXml(sticker.svg, '#666')}
                        width={32}
                        height={32}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>

          {/* Background color picker */}
          <View style={doodleStyles.bgRow}>
            <Text style={doodleStyles.bgLabel}>Canvas:</Text>
            {BG_COLORS.map(c => (
              <TouchableOpacity
                key={c}
                onPress={() => setBgColor(c)}
                style={[
                  doodleStyles.bgDot,
                  {backgroundColor: c, borderWidth: bgColor === c ? 2 : 1, borderColor: bgColor === c ? '#6c5ce7' : '#ddd'},
                ]}
              />
            ))}
          </View>

          {/* Canvas */}
          <View
            style={[doodleStyles.canvas, {backgroundColor: bgColor}]}
            onLayout={(e) => setCanvasWidth(e.nativeEvent.layout.width)}
            {...panResponder.panHandlers}
            ref={canvasRef}>
            <Svg style={StyleSheet.absoluteFill}>
              {paths.map(path => (
                <React.Fragment key={path.id}>
                <Path
                  d={pointsToPath(path.points)}
                  stroke={path.color}
                  strokeWidth={path.size}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                {path.mirrored && (
                  <Path
                    d={pointsToPath(path.points.map(p => ({x: (path.mirrorX || 0) * 2 - p.x, y: p.y})))}
                    stroke={path.color}
                    strokeWidth={path.size}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                )}
                </React.Fragment>
              ))}
              {currentPath && (
                <React.Fragment>
                <Path
                  d={pointsToPath(currentPath.points)}
                  stroke={currentPath.color}
                  strokeWidth={currentPath.size}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                {currentPath.mirrored && (
                  <Path
                    d={pointsToPath(currentPath.points.map(p => ({x: (currentPath.mirrorX || 0) * 2 - p.x, y: p.y})))}
                    stroke={currentPath.color}
                    strokeWidth={currentPath.size}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                )}
                </React.Fragment>
              )}
            </Svg>
            {/* Stickers */}
            {stickers.map(sticker => {
              const stickerData = STICKERS.find(s => s.id === sticker.stickerId);
              if (!stickerData) return null;
              return (
                <View
                  key={sticker.id}
                  style={[
                    doodleStyles.stickerWrapper,
                    {left: sticker.x, top: sticker.y},
                    activeSticker === sticker.id && doodleStyles.stickerActive,
                  ]}
                  onTouchStart={() => setActiveSticker(sticker.id)}
                >
                  <SvgXml
                    xml={getStickerXml(stickerData.svg, sticker.color)}
                    width={60}
                    height={60}
                  />
                  {activeSticker === sticker.id && (
                    <TouchableOpacity
                      style={doodleStyles.stickerDelete}
                      onPress={() => handleDeleteSticker(sticker.id)}>
                      <Icon name="close-circle" size={18} color="#e74c3c" />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
            {paths.length === 0 && !currentPath && stickers.length === 0 && (
              <View style={doodleStyles.canvasHint}>
                <Icon name="gesture-swipe" size={28} color="#ccc" />
                <Text style={doodleStyles.canvasHintText}>Draw or add stickers…</Text>
              </View>
            )}
          </View>

          {/* Actions */}
          <View style={doodleStyles.actions}>
            <TouchableOpacity style={doodleStyles.actionBtn} onPress={handleUndo} disabled={paths.length === 0}>
              <Icon name="undo" size={18} color={paths.length === 0 ? '#ddd' : '#666'} />
              <Text style={[doodleStyles.actionText, paths.length === 0 && {color: '#ddd'}]}>Undo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={doodleStyles.actionBtn} onPress={handleClear} disabled={paths.length === 0}>
              <Icon name="trash-can-outline" size={18} color={paths.length === 0 ? '#ddd' : '#e74c3c'} />
              <Text style={[doodleStyles.actionText, {color: paths.length === 0 ? '#ddd' : '#e74c3c'}]}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[doodleStyles.saveBtn, {backgroundColor: accentColor || '#6c5ce7'}]}
              onPress={handleSave}>
              <Icon name="check" size={16} color="#fff" />
              <Text style={doodleStyles.saveBtnText}>Save Doodle</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
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
      Animated.timing(rotateAnim, {toValue: toVal, duration: 200, useNativeDriver: true}),
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
        <TouchableOpacity
          style={[styles.doodleStandaloneBtn, {borderColor: color + '30', backgroundColor: color + '06'}]}
          onPress={() => setShowDoodleStandalone(true)}
          activeOpacity={0.8}>
          <Icon name="draw" size={15} color={color} />
          <Text style={[styles.doodleStandaloneTxt, {color}]}>Open doodle canvas</Text>
          <Icon name="arrow-right" size={13} color={color + '88'} />
        </TouchableOpacity>
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
    shadowRadius: 10,
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
    backgroundColor: '#fafafa',
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
  doodleStandaloneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    borderStyle: 'dashed',
    padding: 10,
    marginTop: 2,
  },
  doodleStandaloneTxt: {flex: 1, fontSize: 13, fontWeight: '600'},
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
