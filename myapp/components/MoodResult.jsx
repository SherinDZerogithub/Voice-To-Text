import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import Tts from 'react-native-tts';
import Clipboard from '@react-native-clipboard/clipboard';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import PlaylistSuggestions from './PlaylistSuggestions';

const DESIGN_TEXT_LINE_HEIGHT = 26;

const getContrastColor = (hexcolor) => {
  if (!hexcolor || hexcolor === 'transparent') return '#000000';
  const hex = hexcolor.replace('#', '');
  if (hex.length !== 6) return '#000000';
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#1a1a1a' : '#ffffff';
};

const isWhitespace = (value) => /\s/.test(value);

const findLineRange = (sourceText, startIndex, renderedLineText) => {
  if (!renderedLineText) {
    return { start: startIndex, end: startIndex };
  }

  let sourceIndex = startIndex;
  let targetIndex = 0;
  let matchedStart = startIndex;
  let started = false;

  while (sourceIndex < sourceText.length && targetIndex < renderedLineText.length) {
    const sourceChar = sourceText[sourceIndex];
    const targetChar = renderedLineText[targetIndex];
    const sourceIsWhitespace = isWhitespace(sourceChar);
    const targetIsWhitespace = isWhitespace(targetChar);

    if (!started) {
      matchedStart = sourceIndex;
      started = true;
    }

    if (sourceIsWhitespace && targetIsWhitespace) {
      while (sourceIndex < sourceText.length && isWhitespace(sourceText[sourceIndex])) {
        sourceIndex += 1;
      }
      while (targetIndex < renderedLineText.length && isWhitespace(renderedLineText[targetIndex])) {
        targetIndex += 1;
      }
      continue;
    }

    if (sourceChar === targetChar) {
      sourceIndex += 1;
      targetIndex += 1;
      continue;
    }

    if (sourceIsWhitespace) {
      sourceIndex += 1;
      continue;
    }

    if (targetIsWhitespace) {
      targetIndex += 1;
      continue;
    }

    return null;
  }

  if (targetIndex < renderedLineText.length) {
    return null;
  }

  return {
    start: matchedStart,
    end: sourceIndex,
  };
};

const buildLineMetadata = (description, lines) => {
  if (!description || !Array.isArray(lines) || lines.length === 0) {
    return [];
  }

  let searchStart = 0;

  return lines.map((line, index) => {
    const renderedText = line.text || '';
    let range = findLineRange(description, searchStart, renderedText);

    if (!range) {
      const fallbackStart = Math.max(0, searchStart - 2);
      range = findLineRange(description, fallbackStart, renderedText);
    }

    if (!range) {
      range = {
        start: searchStart,
        end: Math.min(description.length, searchStart + renderedText.length),
      };
    }

    searchStart = Math.max(range.end, searchStart);

    return {
      index,
      start: range.start,
      end: range.end,
      y: typeof line.y === 'number' ? line.y : index * DESIGN_TEXT_LINE_HEIGHT,
      height: typeof line.height === 'number' ? line.height : DESIGN_TEXT_LINE_HEIGHT,
      width: typeof line.width === 'number' ? line.width : 0,
      text: renderedText,
    };
  });
};

const EMPATHETIC_REPLIES = {
  sad: [
    "I'm sorry things feel heavy right now. Your feelings are valid and I'm here for you.",
    "It's okay to not be okay. Allow yourself to feel, and know that this cloud will eventually pass.",
    "Sending you a virtual hug. You've navigated difficult days before, and you have that same strength today."
  ],
  anxious: [
    "Breathe. You are safe in this moment. Try to focus on just the next small step.",
    "Anxiety is a heavy burden, but you don't have to carry it all at once. What's one thing you can let go of?",
    "Your mind is working hard to protect you, but it's okay to tell it to take a break. You are capable."
  ],
  lonely: [
    "Even in solitude, your presence has value. I'm glad you're sharing this with me.",
    "Loneliness can be a quiet ache. Remember that you are worthy of connection and community.",
    "It's okay to crave connection. Is there a small way you can reach out to someone today?"
  ],
  angry: [
    "It makes sense to feel frustrated when things aren't right. Your anger is a signal worth listening to.",
    "Take a deep breath. Anger is intense, but it doesn't have to be the only thing you feel.",
    "How can you honor this feeling without letting it consume you? You deserve peace."
  ],
  gloomy: [
    "Gray days are part of the landscape too. Be as gentle with yourself as you would a dear friend.",
    "It's okay to move a bit slower today. Small acts of kindness toward yourself matter.",
    "The light is still there, even if it's hidden for a while. Hang in there."
  ],
  tense: [
    "Your body is holding a lot. Can you take a moment to drop your shoulders and just be?",
    "The pressure is high, but you are more resilient than the stress you're feeling.",
    "Try to find one small moment of release—a stretch, a deep breath, or a glass of water."
  ],
  chaotic: [
    "Everything is loud right now, but you can find a quiet center. Let's find one still point.",
    "It's okay to feel overwhelmed by the noise. What is the most important thing for you right now?",
    "One thing at a time. You don't have to solve the whole puzzle today."
  ],
  default: [
    "I hear you. Thank you for being honest about your journey today.",
    "Whatever you're carrying, you don't have to carry it perfectly. You're doing enough.",
    "I'm here to listen. Sharing your thoughts is a powerful way to care for yourself."
  ]
};

const getEmpatheticReply = (vibe, text = "") => {
  const v = vibe?.toLowerCase();
  const input = text.toLowerCase();

  // NLP Feature: Keyword-based contextual overrides
  if (input.includes("work") || input.includes("job") || input.includes("boss")) {
    return "Work stress can be so all-consuming. Remember that you are so much more than your productivity.";
  }
  if (input.includes("tired") || input.includes("sleep") || input.includes("exhausted")) {
    return "It sounds like you're running on empty. Please give yourself permission to truly rest and recharge.";
  }
  if (input.includes("fail") || input.includes("mistake") || input.includes("wrong")) {
    return "We all stumble. One mistake doesn't define you—it's just part of the learning process.";
  }
  if (input.includes("health") || input.includes("sick") || input.includes("pain")) {
    return "Physical or health struggles are taxing. Be patient and kind to your body today.";
  }

  const replies = EMPATHETIC_REPLIES[v] || EMPATHETIC_REPLIES.default;
  const index = (text.length || 0) % replies.length; 
  return replies[index];
};

const formatMetric = value => {
  if (value === null || value === undefined || value === '') {
    return 'N/A';
  }
  return String(value);
};

const MoodResult = ({
  moodData,
  token,
  backendUrl,
  isAnalyzing,
  isListening,
  hasText,
  setAppBgColor,
  appBgColor,
  onTagPress,
}) => {
  const [isSpeaking, setIsSpeaking] = React.useState(false);
  const [isCopied, setIsCopied] = React.useState(false);
  const [containerWidth, setContainerWidth] = React.useState(0);
  const [lineMetadata, setLineMetadata] = React.useState([]);
  const [activeLineIndex, setActiveLineIndex] = React.useState(-1);
  const highlightTranslateY = React.useRef(new Animated.Value(0)).current;
  const highlightTranslateX = React.useRef(new Animated.Value(0)).current;
  const highlightOpacity = React.useRef(new Animated.Value(0)).current;
  const lineMetadataRef = React.useRef([]);
  const activeLineIndexRef = React.useRef(-1);
  const copiedTimeoutRef = React.useRef(null);
  const contrastColor = getContrastColor(appBgColor);
  const isDarkBg = contrastColor === '#ffffff';

  const handleCopyNarrative = React.useCallback(() => {
    if (!moodData?.description) return;
    Clipboard.setString(moodData.description);
    setIsCopied(true);
    if (copiedTimeoutRef.current) {
      clearTimeout(copiedTimeoutRef.current);
    }
    copiedTimeoutRef.current = setTimeout(() => setIsCopied(false), 1800);
  }, [moodData?.description]);

  React.useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) {
        clearTimeout(copiedTimeoutRef.current);
      }
    };
  }, []);

  // Determine if a "Cheer Up" note should be shown based on valence
  const showSupportiveNote = React.useMemo(() => {
    if (!moodData) return false;
    const negativeVibes = [
      'sad', 'lonely', 'pensive', 'gloomy', 'anxious', 
      'chaotic', 'intense', 'gritty', 'tense', 
      'melancholic', 'solitary', 'industrial'
    ];
    return negativeVibes.includes(moodData.mood?.toLowerCase() || moodData.vibe?.toLowerCase());
  }, [moodData]);

  const empatheticReply = React.useMemo(() => {
    if (!showSupportiveNote || !moodData) return null;
    return getEmpatheticReply(moodData.mood || moodData.vibe, moodData.description || "");
  }, [showSupportiveNote, moodData]);

  const resetHighlight = React.useCallback(() => {
    setActiveLineIndex(-1);
    highlightOpacity.stopAnimation();
    highlightTranslateY.stopAnimation();
    highlightTranslateX.stopAnimation();
    highlightOpacity.setValue(0);
    highlightTranslateY.setValue(0);
    highlightTranslateX.setValue(0);
  }, [highlightOpacity, highlightTranslateY, highlightTranslateX]);

  React.useEffect(() => {
    lineMetadataRef.current = lineMetadata;
  }, [lineMetadata]);

  React.useEffect(() => {
    activeLineIndexRef.current = activeLineIndex;
  }, [activeLineIndex]);

  React.useEffect(() => {
    setLineMetadata([]);
    resetHighlight();
  }, [moodData?.description, resetHighlight]);

  React.useEffect(() => {
    const startListener = Tts.addEventListener('tts-start', () => {
      setIsSpeaking(true);
      if (lineMetadataRef.current.length > 0) {
        setActiveLineIndex(0);
        highlightTranslateY.setValue(lineMetadataRef.current[0].y);
        highlightTranslateX.setValue(0);
        Animated.timing(highlightOpacity, {
          toValue: 1,
          duration: 160,
          useNativeDriver: false,
        }).start();
      }
    });

    const finishSpeaking = () => {
      setIsSpeaking(false);
      resetHighlight();
    };

    const finishListener = Tts.addEventListener('tts-finish', finishSpeaking);
    const cancelListener = Tts.addEventListener('tts-cancel', finishSpeaking);

    const progressListener = Tts.addEventListener('tts-progress', (event) => {
      const currentLineMetadata = lineMetadataRef.current;

      if (!moodData?.description || currentLineMetadata.length === 0) {
        return;
      }

      const currentPos =
        typeof event?.start === 'number'
          ? event.start
          : typeof event?.location === 'number'
            ? event.location
            : 0;

      const nextLineIndex = currentLineMetadata.findIndex((line, index) => {
        const isLastLine = index === currentLineMetadata.length - 1;
        return currentPos >= line.start && (currentPos < line.end || isLastLine);
      });

      const currentActiveLineIndex = activeLineIndexRef.current;
      const safeLineIndex = nextLineIndex >= 0 ? nextLineIndex : currentActiveLineIndex;

      if (safeLineIndex >= 0) {
        const line = currentLineMetadata[safeLineIndex];
        const lineRange = line.end - line.start;
        const lineProgress = lineRange > 0 ? (currentPos - line.start) / lineRange : 0;
        const targetX = Math.max(0, Math.min(line.width, lineProgress * line.width));

        if (safeLineIndex !== currentActiveLineIndex) {
          setActiveLineIndex(safeLineIndex);
          Animated.parallel([
            Animated.timing(highlightTranslateY, {
              toValue: line.y,
              duration: 180,
              useNativeDriver: false,
            }),
            Animated.timing(highlightTranslateX, {
              toValue: targetX,
              duration: 100,
              useNativeDriver: false,
            }),
            Animated.timing(highlightOpacity, {
              toValue: 1,
              duration: 120,
              useNativeDriver: false,
            }),
          ]).start();
        } else {
          // Just update X position within the same line
          Animated.timing(highlightTranslateX, {
            toValue: targetX,
            duration: 100,
            useNativeDriver: false,
          }).start();
        }
      }
    });

    return () => {
      startListener.remove();
      finishListener.remove();
      cancelListener.remove();
      progressListener.remove();
      Tts.stop();
    };
  }, [highlightOpacity, highlightTranslateY, highlightTranslateX, moodData?.description, resetHighlight]);

  const handleSpeak = () => {
    if (isSpeaking) {
      Tts.stop();
      return;
    }

    if (moodData?.description) {
      Tts.stop();
      Tts.speak(moodData.description, {
        androidParams: {
          KEY_PARAM_PAN: -1,
          KEY_PARAM_VOLUME: 1,
          KEY_PARAM_STREAM: 'STREAM_MUSIC',
        },
      });
    }
  };

  const cardStyle = {
    backgroundColor: isDarkBg ? 'rgba(255,255,255,0.1)' : '#ffffff',
    borderColor: isDarkBg ? 'rgba(255,255,255,0.2)' : '#e8e8e8',
  };

  const textStyle = {
    color: contrastColor,
  };

  const secondaryTextStyle = {
    color: isDarkBg ? 'rgba(255,255,255,0.7)' : '#666',
  };

  const activeLine = activeLineIndex >= 0 ? lineMetadata[activeLineIndex] : null;
  const highlightWidth = Math.max(0, containerWidth - 4);

  return (
    <>
      <Text style={[styles.sectionTitle, textStyle]}>Mood Analysis (BERT)</Text>

      {isAnalyzing && (
        <View style={styles.loadingState}>
          <Text style={[styles.loadingDot, secondaryTextStyle]}>...</Text>
          <Text style={[styles.statusText, secondaryTextStyle]}>Analyzing your vibe...</Text>
        </View>
      )}

      {!isAnalyzing && moodData && (
        <View style={styles.resultsContainer}>
          <View style={[styles.moodCard, cardStyle, { borderLeftColor: moodData.color }]}>
            <View style={styles.moodHeader}>
              <Text style={styles.moodEmoji}>{moodData.emoji}</Text>
              <View style={styles.moodTextBlock}>
                <Text style={[styles.moodLabel, { color: moodData.color }]}>
                  {moodData.mood?.toUpperCase()}
                </Text>
                <Text style={[styles.moodConfidence, secondaryTextStyle]}>
                  Confidence: {moodData.confidence}
                  {moodData.gemini_confidence != null
                    ? `  |  Gemini: ${Math.round(moodData.gemini_confidence * 100)}%`
                    : ''}
                </Text>
              </View>
            </View>

            {moodData.poetic_summary ? (
              <Text
                style={[
                  styles.poeticSummary,
                  textStyle,
                  { borderLeftColor: isDarkBg ? 'rgba(255,255,255,0.3)' : '#ccc' },
                ]}
              >
                "{moodData.poetic_summary}"
              </Text>
            ) : (
              <Text style={[styles.moodFeedback, textStyle]}>{moodData.feedback}</Text>
            )}

            {moodData.poetic_summary && (
              <Text style={[styles.moodFeedback, textStyle]}>{moodData.feedback}</Text>
            )}
          </View>

          {empatheticReply && (
            <View style={[styles.supportCard, { backgroundColor: `${moodData.color}10`, borderColor: `${moodData.color}40` }]}>
              <View style={styles.supportHeader}>
                <View style={[styles.supportIconWrap, { backgroundColor: moodData.color }]}>
                  <Text style={{ fontSize: 12 }}>🌿</Text>
                </View>
                <Text style={[styles.supportTitle, { color: moodData.color }]}>Sage's Support</Text>
              </View>
              <Text style={[styles.supportText, textStyle]}>
                {empatheticReply}
              </Text>
              <View style={styles.supportFooter}>
                <Icon name="creation" size={11} color={moodData.color} />
                <Text style={[styles.supportFooterText, { color: moodData.color }]}>Context-aware reply</Text>
              </View>
            </View>
          )}

          {moodData.environment_type && (
            <View
              style={[
                styles.environmentCard,
                cardStyle,
                { borderLeftColor: moodData.color || '#3498db' },
              ]}
            >
              <Text style={[styles.cardLabel, secondaryTextStyle]}>Environment Type</Text>
              <Text style={[styles.environmentText, textStyle]}>{moodData.environment_type}</Text>
            </View>
          )}

          {moodData.prosody_analysis && (
            <View style={[styles.prosodyCard, cardStyle]}>
              <View style={styles.prosodyHeader}>
                <View style={styles.prosodyTitleRow}>
                  <Icon
                    name="waveform"
                    size={20}
                    color={moodData.color || '#6c5ce7'}
                    style={styles.prosodyIcon}
                  />
                  <Text style={[styles.breakdownTitle, styles.prosodyTitle, textStyle]}>
                    Voice Prosody
                  </Text>
                </View>
                {moodData.audio_path ? (
                  <Text style={[styles.prosodySource, secondaryTextStyle]}>Raw audio saved</Text>
                ) : null}
              </View>

              {moodData.prosody_analysis.supported === false ? (
                <Text style={[styles.moodFeedback, textStyle]}>
                  {moodData.prosody_analysis.error || 'Prosody analysis is not available for this audio format.'}
                </Text>
              ) : (
                <>
                  <View style={styles.prosodyGrid}>
                    <View style={styles.prosodyMetric}>
                      <Text style={[styles.cardLabel, secondaryTextStyle]}>Pace</Text>
                      <Text style={[styles.prosodyValue, textStyle]}>
                        {formatMetric(moodData.prosody_analysis.pace?.label)}
                      </Text>
                      <Text style={[styles.prosodyDetail, secondaryTextStyle]}>
                        {moodData.prosody_analysis.pace?.words_per_minute
                          ? `${moodData.prosody_analysis.pace.words_per_minute} wpm`
                          : 'Transcript needed'}
                      </Text>
                    </View>
                    <View style={styles.prosodyMetric}>
                      <Text style={[styles.cardLabel, secondaryTextStyle]}>Pauses</Text>
                      <Text style={[styles.prosodyValue, textStyle]}>
                        {formatMetric(moodData.prosody_analysis.pauses?.count)}
                      </Text>
                      <Text style={[styles.prosodyDetail, secondaryTextStyle]}>
                        {formatMetric(moodData.prosody_analysis.pauses?.total_seconds)} sec
                      </Text>
                    </View>
                    <View style={styles.prosodyMetric}>
                      <Text style={[styles.cardLabel, secondaryTextStyle]}>Volume</Text>
                      <Text style={[styles.prosodyValue, textStyle]}>
                        {formatMetric(moodData.prosody_analysis.volume?.label)}
                      </Text>
                      <Text style={[styles.prosodyDetail, secondaryTextStyle]}>
                        {formatMetric(moodData.prosody_analysis.volume?.average_dbfs)} dBFS
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.toneStrip,
                      { backgroundColor: `${moodData.color || '#6c5ce7'}22` },
                    ]}
                  >
                    <Text style={[styles.toneLabel, secondaryTextStyle]}>Emotional tone</Text>
                    <Text style={[styles.toneValue, textStyle]}>
                      {formatMetric(moodData.prosody_analysis.emotional_tone?.label)}
                    </Text>
                  </View>
                  <Text style={[styles.prosodyNote, secondaryTextStyle]}>
                    {moodData.prosody_analysis.emotional_tone?.note}
                  </Text>
                </>
              )}
            </View>
          )}

          {moodData.description && (
            <View style={[styles.designCard, cardStyle]}>
              <View
                style={[styles.designCardDecor, { backgroundColor: moodData.color || '#3498db' }]}
              />
              <View style={styles.designCardContent}>
                <View style={styles.designCardHeader}>
                  <View style={styles.designCardHeaderMain}>
                    <Text style={styles.designCardIcon}>*</Text>
                    <Text style={[styles.designCardTitle, textStyle]}>Cinematic Narrative</Text>
                  </View>
                  <View style={styles.narrativeActionsRow}>
                    <TouchableOpacity
                      style={[
                        styles.speakerButton,
                        isCopied && styles.speakerButtonActive,
                        isDarkBg && {
                          backgroundColor: 'rgba(255,255,255,0.1)',
                          borderColor: 'rgba(255,255,255,0.2)',
                        },
                      ]}
                      onPress={handleCopyNarrative}
                      activeOpacity={0.6}
                    >
                      <Icon
                        name={isCopied ? 'check' : 'content-copy'}
                        size={20}
                        color={isCopied ? '#2ecc71' : moodData.color || '#3498db'}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.speakerButton,
                        isSpeaking && styles.speakerButtonActive,
                        isDarkBg && {
                          backgroundColor: 'rgba(255,255,255,0.1)',
                          borderColor: 'rgba(255,255,255,0.2)',
                        },
                      ]}
                      onPress={handleSpeak}
                      activeOpacity={0.6}
                    >
                      <Icon
                        name={isSpeaking ? 'stop-circle' : 'volume-high'}
                        size={24}
                        color={isSpeaking ? '#ff4757' : moodData.color || '#3498db'}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
                <View
                  style={styles.textContainer}
                  onLayout={(event) => {
                    setContainerWidth(event.nativeEvent.layout.width);
                  }}
                >
                  {activeLine && (
                    <Animated.View
                      pointerEvents="none"
                      style={[
                        styles.lineHighlighter,
                        {
                          opacity: highlightOpacity,
                          width: 4,
                          height: activeLine.height - 4,
                          backgroundColor: moodData.color || '#3498db',
                          shadowColor: moodData.color || '#3498db',
                          shadowRadius: 8,
                          shadowOpacity: 0.8,
                          transform: [
                            { translateY: highlightTranslateY },
                            { translateX: highlightTranslateX }
                          ],
                        },
                      ]}
                    />
                  )}
                  <Text
                    selectable={true}
                    style={[styles.designCardText, textStyle]}
                    onTextLayout={(event) => {
                      const nextMetadata = buildLineMetadata(
                        moodData.description,
                        event.nativeEvent.lines || [],
                      );
                      setLineMetadata(nextMetadata);
                    }}
                  >
                    {moodData.description}
                  </Text>
                </View>
                <View
                  style={[
                    styles.designCardFooter,
                    { borderTopColor: isDarkBg ? 'rgba(255,255,255,0.1)' : '#f0f0f0' },
                  ]}
                >
                  <Text style={[styles.designCardFooterText, secondaryTextStyle]}>
                    AI Visual Analysis | Gemini 1.5
                  </Text>
                </View>
              </View>
            </View>
          )}

          {moodData.color_palette && moodData.color_palette.length > 0 && (
            <View style={[styles.paletteCard, cardStyle]}>
              <Text style={[styles.cardLabel, secondaryTextStyle]}>Scene Color Palette</Text>
              <View style={styles.paletteRow}>
                {moodData.color_palette.map((hex, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.swatchWrapper}
                    onPress={() => setAppBgColor(hex)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.swatch,
                        {
                          backgroundColor: hex,
                          borderColor: isDarkBg ? 'rgba(255,255,255,0.3)' : '#ddd',
                        },
                      ]}
                    />
                    <Text style={[styles.swatchHex, secondaryTextStyle]}>{hex}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {moodData.scene_tags && moodData.scene_tags.length > 0 && (
            <View style={[styles.tagsCard, cardStyle]}>
              <Text style={[styles.cardLabel, secondaryTextStyle]}>Scene Tags</Text>
              <View style={styles.tagsRow}>
                {moodData.scene_tags.map((tag, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.tag, { backgroundColor: `${moodData.color}40` }]}
                    onPress={() => onTagPress && onTagPress(tag)}
                    activeOpacity={onTagPress ? 0.7 : 1}>
                    <Text style={[styles.tagText, { color: isDarkBg ? '#fff' : moodData.color }]}>
                      {tag}
                    </Text>
                    {onTagPress && (
                      <Text style={[styles.tagText, { color: isDarkBg ? '#fff' : moodData.color, fontSize: 9, opacity: 0.7 }]}>
                        {' '}↗
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {moodData.secondary_moods && moodData.secondary_moods.length > 0 && (
            <View style={[styles.breakdownCard, cardStyle]}>
              <Text style={[styles.breakdownTitle, textStyle]}>Secondary Moods (Gemini)</Text>
              {moodData.secondary_moods.map((item) => (
                <View key={item.label} style={styles.emotionRow}>
                  <View style={styles.emotionInfo}>
                    <Text style={[styles.emotionLabel, secondaryTextStyle]}>{item.label}</Text>
                    <Text style={[styles.emotionPercentage, secondaryTextStyle]}>
                      {Math.round((item.score || 0) * 100)}%
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.progressBarContainer,
                      { backgroundColor: isDarkBg ? 'rgba(255,255,255,0.1)' : '#f0f0f0' },
                    ]}
                  >
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${(item.score || 0) * 100}%`, backgroundColor: '#9b59b6' },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}

          {moodData.all_scores && moodData.all_scores.length > 0 && (
            <View style={[styles.breakdownCard, cardStyle]}>
              <Text style={[styles.breakdownTitle, textStyle]}>Vibe Breakdown - Top 5 (BERT)</Text>
              {moodData.all_scores.slice(0, 5).map((item) => (
                <View key={item.label} style={styles.emotionRow}>
                  <View style={styles.emotionInfo}>
                    <Text style={styles.emotionEmoji}>{item.emoji}</Text>
                    <Text style={[styles.emotionLabel, secondaryTextStyle]}>{item.label}</Text>
                    <Text style={[styles.emotionPercentage, secondaryTextStyle]}>
                      {item.percentage}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.progressBarContainer,
                      { backgroundColor: isDarkBg ? 'rgba(255,255,255,0.1)' : '#f0f0f0' },
                    ]}
                  >
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${item.score * 100}%`, backgroundColor: item.color },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}

          <PlaylistSuggestions
            vibe={moodData?.vibe || moodData?.mood}
            token={token}
            backendUrl={backendUrl}
            accentColor={moodData?.color}
          />
        </View>
      )}

      {!isAnalyzing && !moodData && !isListening && !hasText && (
        <View style={[styles.emptyState, cardStyle, { borderStyle: 'dashed' }]}>
          <Text style={[styles.emptyStateText, secondaryTextStyle]}>
            Speak into the microphone or analyze an image to detect its vibe.
          </Text>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    width: '100%',
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 36,
    marginBottom: 14,
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingDot: {
    fontSize: 20,
    color: '#aaa',
    letterSpacing: 2,
  },
  statusText: {
    marginTop: 4,
    color: '#666',
    fontWeight: 'bold',
  },
  resultsContainer: {
    width: '100%',
    gap: 14,
  },
  moodCard: {
    width: '100%',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderLeftWidth: 5,
    backgroundColor: '#fff',
    marginTop: 5,
  },
  moodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  moodTextBlock: {
    flex: 1,
  },
  moodEmoji: {
    fontSize: 44,
    marginRight: 16,
  },
  moodLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  moodConfidence: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  poeticSummary: {
    fontSize: 15,
    fontStyle: 'italic',
    color: '#444',
    lineHeight: 22,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#ccc',
    paddingLeft: 10,
  },
  moodFeedback: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginTop: 4,
  },
  designCard: {
    width: '100%',
    borderRadius: 20,
    backgroundColor: '#fff',
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  designCardDecor: {
    height: 6,
    width: '100%',
  },
  designCardContent: {
    padding: 24,
  },
  designCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  designCardHeaderMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  narrativeActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  speakerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  speakerButtonActive: {
    backgroundColor: '#fff5f5',
    borderColor: '#ffe3e3',
  },
  designCardIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  designCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  designCardText: {
    fontSize: 16,
    color: '#2d3436',
    lineHeight: DESIGN_TEXT_LINE_HEIGHT,
    fontStyle: 'italic',
    fontWeight: '400',
  },
  designCardFooter: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    alignItems: 'flex-end',
  },
  designCardFooterText: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
    letterSpacing: 1,
  },
  textContainer: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 8,
    paddingHorizontal: 2,
  },
  lineHighlighter: {
    position: 'absolute',
    left: 0,
    top: 2,
    borderRadius: 2,
    zIndex: 10,
    elevation: 10,
  },
  environmentCard: {
    width: '100%',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    backgroundColor: '#fff',
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
  },
  environmentText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    letterSpacing: 0.3,
  },
  prosodyCard: {
    width: '100%',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  prosodyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 14,
  },
  prosodyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  prosodyIcon: {
    marginRight: 8,
  },
  prosodySource: {
    fontSize: 11,
    color: '#888',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  prosodyTitle: {
    marginBottom: 0,
  },
  prosodyGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  prosodyMetric: {
    flex: 1,
    minHeight: 82,
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(108,92,231,0.08)',
  },
  prosodyValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2d3436',
    textTransform: 'capitalize',
  },
  prosodyDetail: {
    marginTop: 4,
    fontSize: 12,
    color: '#777',
  },
  toneStrip: {
    borderRadius: 10,
    padding: 12,
    marginTop: 2,
  },
  toneLabel: {
    fontSize: 11,
    color: '#777',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  toneValue: {
    fontSize: 15,
    color: '#2d3436',
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  prosodyNote: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 17,
    color: '#777',
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  paletteCard: {
    width: '100%',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    backgroundColor: '#fff',
  },
  paletteRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  swatchWrapper: {
    alignItems: 'center',
    gap: 4,
  },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#ddd',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  swatchHex: {
    fontSize: 10,
    color: '#888',
    fontFamily: 'monospace',
  },
  tagsCard: {
    width: '100%',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    backgroundColor: '#fff',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  breakdownCard: {
    width: '100%',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  breakdownTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#444',
    marginBottom: 14,
  },
  supportCard: {
    width: '100%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    gap: 10,
  },
  supportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  supportIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  supportTitle: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  supportText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  supportFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  supportFooterText: {
    fontSize: 10,
    fontWeight: '700',
  },
  emotionRow: {
    marginBottom: 12,
  },
  emotionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  emotionEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  emotionLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    textTransform: 'capitalize',
  },
  emotionPercentage: {
    fontSize: 12,
    fontWeight: '700',
    color: '#888',
  },
  progressBarContainer: {
    height: 8,
    width: '100%',
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  emptyState: {
    width: '100%',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#666',
    textAlign: 'center',
  },
});

export default MoodResult;
