import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Animated, Easing } from 'react-native';
import Tts from 'react-native-tts';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

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

const MoodResult = ({ moodData, isAnalyzing, isListening, hasText, setAppBgColor, appBgColor }) => {
  const [isSpeaking, setIsSpeaking] = React.useState(false);
  const [containerWidth, setContainerWidth] = React.useState(0);
  const shimmerAnim = React.useRef(new Animated.Value(0)).current;
  const contrastColor = getContrastColor(appBgColor);
  const isDarkBg = contrastColor === '#ffffff';

  React.useEffect(() => {
    let animation;
    if (isSpeaking) {
      shimmerAnim.setValue(0);
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 4000,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    } else {
      shimmerAnim.stopAnimation();
    }
    return () => {
      if (animation) animation.stop();
    };
  }, [isSpeaking, shimmerAnim]);

  React.useEffect(() => {
    Tts.addEventListener('tts-start', () => setIsSpeaking(true));
    Tts.addEventListener('tts-finish', () => setIsSpeaking(false));
    Tts.addEventListener('tts-cancel', () => setIsSpeaking(false));

    return () => {
      Tts.stop();
    };
  }, []);

  const handleSpeak = () => {
    if (isSpeaking) {
      Tts.stop();
      setIsSpeaking(false);
    } else {
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

  return (
    <>
      <Text style={[styles.sectionTitle, textStyle]}>Mood Analysis (BERT)</Text>

      {isAnalyzing && (
        <View style={styles.loadingState}>
          <Text style={[styles.loadingDot, secondaryTextStyle]}>● ● ●</Text>
          <Text style={[styles.statusText, secondaryTextStyle]}>Analyzing your vibe...</Text>
        </View>
      )}

      {!isAnalyzing && moodData && (
        <View style={styles.resultsContainer}>

          {/* ── Dominant Mood Card ── */}
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
                    ? `  ·  Gemini: ${Math.round(moodData.gemini_confidence * 100)}%`
                    : ''}
                </Text>
              </View>
            </View>

            {/* Poetic Summary (Gemini Stage 2) */}
            {moodData.poetic_summary ? (
              <Text style={[styles.poeticSummary, textStyle, { borderLeftColor: isDarkBg ? 'rgba(255,255,255,0.3)' : '#ccc' }]}>
                "{moodData.poetic_summary}"
              </Text>
            ) : (
              <Text style={[styles.moodFeedback, textStyle]}>{moodData.feedback}</Text>
            )}

            {/* BERT Feedback always shown below poetic summary if present */}
            {moodData.poetic_summary && (
              <Text style={[styles.moodFeedback, textStyle]}>{moodData.feedback}</Text>
            )}
          </View>

          {/* ── Environment Type (Gemini) ── */}
          {moodData.environment_type && (
            <View style={[styles.environmentCard, cardStyle, { borderLeftColor: moodData.color || '#3498db' }]}>
              <Text style={[styles.cardLabel, secondaryTextStyle]}>📍 Environment Type</Text>
              <Text style={[styles.environmentText, textStyle]}>{moodData.environment_type}</Text>
            </View>
          )}

          {/* ── Scene Description Design Card (Cinematic Narrative) ── */}
          {moodData.description && (
            <View style={[styles.designCard, cardStyle]}>
              <View style={[styles.designCardDecor, { backgroundColor: moodData.color || '#3498db' }]} />
              <View style={styles.designCardContent}>
                <View style={styles.designCardHeader}>
                  <View style={styles.designCardHeaderMain}>
                    <Text style={styles.designCardIcon}>✨</Text>
                    <Text style={[styles.designCardTitle, textStyle]}>Cinematic Narrative</Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.speakerButton,
                      isSpeaking && styles.speakerButtonActive,
                      isDarkBg && { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)' }
                    ]}
                    onPress={handleSpeak}
                    activeOpacity={0.6}
                  >
                    <Icon
                      name={isSpeaking ? 'stop-circle' : 'volume-high'}
                      size={24}
                      color={isSpeaking ? '#ff4757' : (moodData.color || '#3498db')}
                    />
                  </TouchableOpacity>
                </View>
                <View 
                  style={styles.textContainer}
                  onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
                >
                  <Text selectable={true} style={[styles.designCardText, textStyle]}>{moodData.description}</Text>
                  <Animated.View
                    style={[
                      styles.shimmerBeam,
                      {
                        opacity: isSpeaking ? 1 : 0,
                        backgroundColor: moodData.color || '#3498db',
                        shadowColor: moodData.color || '#3498db',
                        shadowRadius: 10,
                        shadowOpacity: 0.8,
                        shadowOffset: { width: 0, height: 0 },
                        transform: [
                          {
                            translateX: shimmerAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [-20, containerWidth + 20],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                </View>
                <View style={[styles.designCardFooter, { borderTopColor: isDarkBg ? 'rgba(255,255,255,0.1)' : '#f0f0f0' }]}>
                  <Text style={[styles.designCardFooterText, secondaryTextStyle]}>AI Visual Analysis • Gemini 1.5</Text>
                </View>
              </View>
            </View>
          )}

          {/* ── Color Palette (Gemini) ── */}
          {moodData.color_palette && moodData.color_palette.length > 0 && (
            <View style={[styles.paletteCard, cardStyle]}>
              <Text style={[styles.cardLabel, secondaryTextStyle]}>🎨 Scene Color Palette</Text>
              <View style={styles.paletteRow}>
                {moodData.color_palette.map((hex, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.swatchWrapper}
                    onPress={() => setAppBgColor(hex)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.swatch, { backgroundColor: hex, borderColor: isDarkBg ? 'rgba(255,255,255,0.3)' : '#ddd' }]} />
                    <Text style={[styles.swatchHex, secondaryTextStyle]}>{hex}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* ── Scene Tags (Gemini) ── */}
          {moodData.scene_tags && moodData.scene_tags.length > 0 && (
            <View style={[styles.tagsCard, cardStyle]}>
              <Text style={[styles.cardLabel, secondaryTextStyle]}>🏷️ Scene Tags</Text>
              <View style={styles.tagsRow}>
                {moodData.scene_tags.map((tag, i) => (
                  <View key={i} style={[styles.tag, { backgroundColor: moodData.color + '40' }]}>
                    <Text style={[styles.tagText, { color: isDarkBg ? '#fff' : moodData.color }]}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── Secondary Moods (Gemini) ── */}
          {moodData.secondary_moods && moodData.secondary_moods.length > 0 && (
            <View style={[styles.breakdownCard, cardStyle]}>
              <Text style={[styles.breakdownTitle, textStyle]}>🎭 Secondary Moods (Gemini)</Text>
              {moodData.secondary_moods.map((item) => {
                return (
                  <View key={item.label} style={styles.emotionRow}>
                    <View style={styles.emotionInfo}>
                      <Text style={[styles.emotionLabel, secondaryTextStyle]}>{item.label}</Text>
                      <Text style={[styles.emotionPercentage, secondaryTextStyle]}>
                        {Math.round((item.score || 0) * 100)}%
                      </Text>
                    </View>
                    <View style={[styles.progressBarContainer, { backgroundColor: isDarkBg ? 'rgba(255,255,255,0.1)' : '#f0f0f0' }]}>
                      <View
                        style={[
                          styles.progressBarFill,
                          { width: `${(item.score || 0) * 100}%`, backgroundColor: '#9b59b6' },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* ── Full BERT Breakdown ── */}
          {moodData.all_scores && moodData.all_scores.length > 0 && (
            <View style={[styles.breakdownCard, cardStyle]}>
              <Text style={[styles.breakdownTitle, textStyle]}>📊 Vibe Breakdown — Top 5 (BERT)</Text>
              {moodData.all_scores.slice(0, 5).map((item) => (
                <View key={item.label} style={styles.emotionRow}>
                  <View style={styles.emotionInfo}>
                    <Text style={styles.emotionEmoji}>{item.emoji}</Text>
                    <Text style={[styles.emotionLabel, secondaryTextStyle]}>{item.label}</Text>
                    <Text style={[styles.emotionPercentage, secondaryTextStyle]}>{item.percentage}</Text>
                  </View>
                  <View style={[styles.progressBarContainer, { backgroundColor: isDarkBg ? 'rgba(255,255,255,0.1)' : '#f0f0f0' }]}>
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
    letterSpacing: 6,
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
    lineHeight: 26,
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
  },
  shimmerBeam: {
    position: 'absolute',
    top: -10,
    bottom: -10,
    width: 3,
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