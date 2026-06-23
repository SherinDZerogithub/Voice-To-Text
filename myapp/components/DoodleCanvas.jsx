import React, {useEffect, useRef, useState} from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Svg, {Path, SvgXml} from 'react-native-svg';

// ─── Doodle Canvas ───────────────────────────────────────────────────────────
// Shared freehand-drawing + sticker engine used by JournalPrompts (per-entry
// doodle answers) and StoryJournalBook (full journal pages). Keeping this in
// one place means both features draw, erase, and place stickers identically.

export const BRUSH_SIZES = [2, 4, 8, 14, 20];
export const BRUSH_COLORS = [
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

export const STICKERS = [
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

export const getStickerXml = (svgContent, color) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">${svgContent.replace(
    /STROKE/g,
    color,
  )}</svg>`;

export const pointsToPath = points => {
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

export const DoodleCanvas = ({visible, onClose, onSave, accentColor, initialData}) => {
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState(null);
  const [brushColor, setBrushColor] = useState('#2d3436');
  const [brushSize, setBrushSize] = useState(4);
  const [isEraser, setIsEraser] = useState(false);
  const [isMirror, setIsMirror] = useState(false);
  const [bgColor, setBgColor] = useState('#fffdf7');
  const [prompt, setPrompt] = useState(DOODLE_PROMPTS[0]);
  const [canvasWidth, setCanvasWidth] = useState(0);
  const [stickers, setStickers] = useState([]);
  const [activeSticker, setActiveSticker] = useState(null);
  const [showStickerPanel, setShowStickerPanel] = useState(false);
  const [stickerMode, setStickerMode] = useState(false); // true = move stickers, false = draw
  const canvasRef = useRef(null);
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Refs so panResponder always reads latest values
  const brushColorRef = useRef(brushColor);
  const brushSizeRef = useRef(brushSize);
  const isEraserRef = useRef(isEraser);
  const isMirrorRef = useRef(isMirror);
  const bgColorRef = useRef(bgColor);
  const canvasWidthRef = useRef(canvasWidth);
  const stickerModeRef = useRef(stickerMode);

  useEffect(() => { brushColorRef.current = brushColor; }, [brushColor]);
  useEffect(() => { brushSizeRef.current = brushSize; }, [brushSize]);
  useEffect(() => { isEraserRef.current = isEraser; }, [isEraser]);
  useEffect(() => { isMirrorRef.current = isMirror; }, [isMirror]);
  useEffect(() => { bgColorRef.current = bgColor; }, [bgColor]);
  useEffect(() => { canvasWidthRef.current = canvasWidth; }, [canvasWidth]);
  useEffect(() => { stickerModeRef.current = stickerMode; }, [stickerMode]);

  useEffect(() => {
    if (visible) {
      setPrompt(DOODLE_PROMPTS[Math.floor(Math.random() * DOODLE_PROMPTS.length)]);
      // Load any existing doodle (editing a previously saved page/answer)
      setPaths(initialData?.paths || []);
      setStickers(initialData?.stickers || []);
      setBgColor(initialData?.bgColor || '#fffdf7');
      Animated.parallel([
        Animated.spring(scaleAnim, {toValue: 1, tension: 60, friction: 10, useNativeDriver: false}),
        Animated.timing(opacityAnim, {toValue: 1, duration: 250, useNativeDriver: false}),
      ]).start();
    } else {
      scaleAnim.setValue(0.92);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !stickerModeRef.current,
      onMoveShouldSetPanResponder: () => !stickerModeRef.current,
      onPanResponderGrant: evt => {
        if (stickerModeRef.current) return;
        const {locationX, locationY} = evt.nativeEvent;
        const newPath = {
          points: [{x: locationX, y: locationY}],
          color: isEraserRef.current ? bgColorRef.current : brushColorRef.current,
          size: isEraserRef.current ? brushSizeRef.current * 3 : brushSizeRef.current,
          id: Date.now(),
          mirrored: isMirrorRef.current,
          mirrorX: canvasWidthRef.current / 2,
        };
        setCurrentPath(newPath);
      },
      onPanResponderMove: evt => {
        if (stickerModeRef.current) return;
        const {locationX, locationY} = evt.nativeEvent;
        setCurrentPath(prev => {
          if (!prev) return prev;
          return {...prev, points: [...prev.points, {x: locationX, y: locationY}]};
        });
      },
      onPanResponderRelease: () => {
        if (stickerModeRef.current) return;
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

  const hasDoodleContent = paths.length > 0 || stickers.length > 0;
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
    const finalPaths = currentPath ? [...paths, currentPath] : paths;
    const doodleData = {paths: finalPaths, bgColor, stickers, timestamp: Date.now()};
    onSave && onSave(doodleData);
    onClose();
  };

  const handleAddSticker = stickerId => {
    const newSticker = {
      id: Date.now(),
      stickerId,
      x: canvasWidth / 2 - 40,
      y: 100,
      scale: 1,
      color: brushColorRef.current,
    };
    setStickers(prev => [...prev, newSticker]);
    setActiveSticker(newSticker.id);
    setShowStickerPanel(false);
    setStickerMode(true);
  };

  const handleDeleteSticker = id => {
    setStickers(prev => prev.filter(s => s.id !== id));
    setActiveSticker(null);
  };

  const BG_COLORS = ['#fffdf7', '#f8f0ff', '#e8fff8', '#fff0f5', '#f0f8ff', '#fffbf0', '#f0fff4', '#1a1a2e', '#2C3E50', '#E8E8F5'];

  // Sticker component with its own pan+pinch handling
  const DraggableSticker = ({sticker}) => {
    const stickerData = STICKERS.find(s => s.id === sticker.stickerId);
    if (!stickerData) return null;
    const isActive = activeSticker === sticker.id;
    const posRef = useRef({x: sticker.x, y: sticker.y});
    const scaleRef = useRef(sticker.scale);

    const stickerPan = useRef(PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setActiveSticker(sticker.id);
        posRef.current = {x: sticker.x, y: sticker.y};
      },
      onPanResponderMove: (_, g) => {
        const newX = posRef.current.x + g.dx;
        const newY = posRef.current.y + g.dy;
        setStickers(prev => prev.map(s => s.id === sticker.id ? {...s, x: newX, y: newY} : s));
      },
      onPanResponderRelease: (_, g) => {
        posRef.current = {x: posRef.current.x + g.dx, y: posRef.current.y + g.dy};
      },
    })).current;

    const stickerSize = 60 * sticker.scale;

    return (
      <View
        style={[
          doodleStyles.stickerWrapper,
          {left: sticker.x, top: sticker.y, width: stickerSize, height: stickerSize},
          isActive && doodleStyles.stickerActive,
        ]}
        {...stickerPan.panHandlers}>
        <SvgXml
          xml={getStickerXml(stickerData.svg, sticker.color)}
          width={stickerSize}
          height={stickerSize}
        />
        {isActive && (
          <>
            <TouchableOpacity
              style={doodleStyles.stickerDelete}
              onPress={() => handleDeleteSticker(sticker.id)}>
              <Icon name="close-circle" size={18} color="#e74c3c" />
            </TouchableOpacity>
            {/* Resize handle */}
            <View
              style={doodleStyles.stickerResizeHandle}
              {...PanResponder.create({
                onStartShouldSetPanResponder: () => true,
                onMoveShouldSetPanResponder: () => true,
                onPanResponderGrant: () => { scaleRef.current = sticker.scale; },
                onPanResponderMove: (_, g) => {
                  const newScale = Math.max(0.4, Math.min(3.0, scaleRef.current + (g.dx + g.dy) / 80));
                  setStickers(prev => prev.map(s => s.id === sticker.id ? {...s, scale: newScale} : s));
                },
              }).panHandlers}>
              <Icon name="arrow-expand" size={12} color="#6c5ce7" />
            </View>
          </>
        )}
      </View>
    );
  };

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
              <TouchableOpacity
                onPress={() => setStickerMode(m => !m)}
                style={[doodleStyles.sizeBtn, stickerMode && doodleStyles.activeTool]}>
                <Icon name="cursor-move" size={16} color={stickerMode ? '#6c5ce7' : '#888'} />
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
            {stickers.map(sticker => (
              <DraggableSticker key={sticker.id} sticker={sticker} />
            ))}
            {paths.length === 0 && !currentPath && stickers.length === 0 && (
              <View style={doodleStyles.canvasHint}>
                <Icon name="gesture-swipe" size={28} color="#ccc" />
                <Text style={doodleStyles.canvasHintText}>Draw or add stickers…</Text>
              </View>
            )}
          </View>

          {/* Actions */}
          <View style={doodleStyles.actions}>
            <TouchableOpacity style={doodleStyles.actionBtn} onPress={handleUndo} disabled={paths.length === 0 && stickers.length === 0}>
              <Icon name="undo" size={18} color={(paths.length === 0 && stickers.length === 0) ? '#ddd' : '#666'} />
              <Text style={[doodleStyles.actionText, (paths.length === 0 && stickers.length === 0) && {color: '#ddd'}]}>Undo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={doodleStyles.actionBtn} onPress={handleClear} disabled={paths.length === 0 && stickers.length === 0}>
              <Icon name="trash-can-outline" size={18} color={(paths.length === 0 && stickers.length === 0) ? '#ddd' : '#e74c3c'} />
              <Text style={[doodleStyles.actionText, {color: (paths.length === 0 && stickers.length === 0) ? '#ddd' : '#e74c3c'}]}>Clear</Text>
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

export default DoodleCanvas;
