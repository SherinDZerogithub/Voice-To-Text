import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

const MoodResult = ({moodData, isAnalyzing, isListening, hasText}) => {
  return (
    <>
      <Text style={styles.sectionTitle}>Mood Analysis (BERT)</Text>
      {isAnalyzing && (
        <Text style={styles.statusText}>Analyzing your vibe...</Text>
      )}

      {!isAnalyzing && moodData && (
        <View style={styles.resultsContainer}>
          <View
            style={[styles.moodCard, {backgroundColor: moodData.color + '20'}]}
          >
            <View style={styles.moodHeader}>
              <Text style={styles.moodEmoji}>{moodData.emoji}</Text>
              <View>
                <Text style={[styles.moodLabel, {color: moodData.color}]}>
                  Dominant Mood: {moodData.mood.toUpperCase()}
                </Text>
                <Text style={styles.moodConfidence}>
                  Confidence: {moodData.confidence}
                </Text>
              </View>
            </View>
            <Text style={styles.moodFeedback}>{moodData.feedback}</Text>
          </View>

          {/* Emotion Breakdown Section - Show Top 5 */}
          {moodData.all_scores && moodData.all_scores.length > 0 && (
            <View style={styles.breakdownCard}>
              <Text style={styles.breakdownTitle}>Vibe Breakdown (Top 5)</Text>
              {moodData.all_scores.slice(0, 5).map((item, index) => (
                <View key={item.label} style={styles.emotionRow}>
                  <View style={styles.emotionInfo}>
                    <Text style={styles.emotionEmoji}>{item.emoji}</Text>
                    <Text style={styles.emotionLabel}>{item.label}</Text>
                    <Text style={styles.emotionPercentage}>{item.percentage}</Text>
                  </View>
                  <View style={styles.progressBarContainer}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${item.score * 100}%`,
                          backgroundColor: item.color,
                        },
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
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            Speak into the microphone to detect your mood using BERT NLP.
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
  statusText: {
    marginTop: 10,
    color: '#666',
    fontWeight: 'bold',
  },
  resultsContainer: {
    width: '100%',
    gap: 15,
  },
  moodCard: {
    width: '100%',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    marginTop: 5,
  },
  breakdownCard: {
    width: '100%',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#444',
    marginBottom: 15,
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
  moodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  moodEmoji: {
    fontSize: 40,
    marginRight: 15,
  },
  moodLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  moodConfidence: {
    fontSize: 12,
    color: '#666',
  },
  moodFeedback: {
    fontSize: 16,
    color: '#333',
    fontStyle: 'italic',
    lineHeight: 22,
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
