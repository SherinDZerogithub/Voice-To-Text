import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
} from 'react-native';
import Svg, {
  G,
  Circle,
  Path,
  Line,
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const GoalAlignmentRing = ({moodGoal, analyticsData, onGoalUpdate}) => {
  const [progress, setProgress] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [nextSteps, setNextSteps] = useState([]);

  const ringAnim = useRef(new Animated.Value(0)).current;
  const needleAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Calculate progress based on mood goal
  useEffect(() => {
    if (!moodGoal?.vibes || !analyticsData?.vibe_breakdown) {
      setProgress(0);
      return;
    }

    const goalVibes = Array.isArray(moodGoal.vibes)
      ? moodGoal.vibes
      : [moodGoal.vibe];
    const totalEntries = analyticsData.total_entries || 1;
    const goalEntries = analyticsData.vibe_breakdown
      .filter(v => goalVibes.includes(v.label.toLowerCase()))
      .reduce((sum, v) => sum + v.count, 0);

    const calculatedProgress = Math.min(
      (goalEntries / Math.max(totalEntries * 0.5, 5)) * 100,
      100,
    );
    setProgress(calculatedProgress);

    // Generate next steps
    generateNextSteps(calculatedProgress, goalVibes);

    // Animate ring and needle
    Animated.parallel([
      Animated.spring(ringAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(needleAnim, {
        toValue: calculatedProgress / 100,
        duration: 1200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [moodGoal, analyticsData, needleAnim, ringAnim]);

  const generateNextSteps = (currentProgress, goalVibes) => {
    const steps = [];

    if (currentProgress < 30) {
      steps.push({
        emoji: '🎯',
        text: `You're ${Math.round(currentProgress)}% toward your goal`,
        action: 'Try logging one positive moment today',
      });
      steps.push({
        emoji: '📝',
        text: 'Log your first entry',
        action: 'Use the Mood Dice for a quick prompt',
      });
    } else if (currentProgress < 70) {
      steps.push({
        emoji: '🚀',
        text: `You're ${Math.round(currentProgress)}% there!`,
        action: 'Your compass is pointing the right way',
      });
      steps.push({
        emoji: '💪',
        text: 'Keep the momentum',
        action: 'One more ${goalVibes[0]} day will help',
      });
    } else {
      steps.push({
        emoji: '🏁',
        text: `Almost there! ${Math.round(currentProgress)}% complete`,
        action: 'One more calm day will complete your goal',
      });
      steps.push({
        emoji: '🎉',
        text: 'Goal completion is near',
        action: "You're about to unlock a badge!",
      });
    }

    setNextSteps(steps);
  };

  const getCompassMessage = prog => {
    if (prog < 30) {
      return 'Finding direction...';
    }
    if (prog < 70) {
      return 'On the right path';
    }
    if (prog < 100) {
      return 'Almost aligned';
    }
    return 'Goal achieved! 🎉';
  };

  const CompassRing = ({progress}) => {
    const size = 240;
    const cx = size / 2;
    const cy = size / 2;
    const outerRadius = 100;
    const innerRadius = 70;

    // Needle angle (0-270 degrees for progress)
    const needleAngle = (progress / 100) * 270 - 135;
    const needleRad = (needleAngle * Math.PI) / 180;
    const needleEndX = cx + 60 * Math.cos(needleRad);
    const needleEndY = cy + 60 * Math.sin(needleRad);

    // Cardinal directions
    const directions = [
      {label: 'N', angle: 0},
      {label: 'E', angle: 90},
      {label: 'S', angle: 180},
      {label: 'W', angle: 270},
    ];

    return (
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <LinearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#6c5ce7" stopOpacity="0.3" />
            <Stop offset="100%" stopColor="#6c5ce7" stopOpacity="0.1" />
          </LinearGradient>
          <LinearGradient id="needleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#FF6B6B" />
            <Stop offset="100%" stopColor="#FFD93D" />
          </LinearGradient>
        </Defs>

        {/* Outer ring */}
        <Circle
          cx={cx}
          cy={cy}
          r={outerRadius}
          fill="none"
          stroke="#E8E6F5"
          strokeWidth="2"
        />

        {/* Progress ring */}
        <Circle
          cx={cx}
          cy={cy}
          r={outerRadius}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth="8"
          strokeDasharray={`${(progress / 100) * 2 * Math.PI * outerRadius} ${
            2 * Math.PI * outerRadius
          }`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />

        {/* Inner circle */}
        <Circle
          cx={cx}
          cy={cy}
          r={innerRadius}
          fill="#fff"
          stroke="#E8E6F5"
          strokeWidth="1"
        />

        {/* Cardinal directions */}
        {directions.map((dir, i) => {
          const angle = (dir.angle * Math.PI) / 180;
          const x = cx + (outerRadius - 15) * Math.cos(angle);
          const y = cy + (outerRadius - 15) * Math.sin(angle);
          return (
            <SvgText
              key={i}
              x={x}
              y={y}
              textAnchor="middle"
              fontSize="14"
              fontWeight="bold"
              fill="#6c5ce7">
              {dir.label}
            </SvgText>
          );
        })}

        {/* Degree markers */}
        {Array.from({length: 37}).map((_, i) => {
          const angle = (i * 10 - 90) * (Math.PI / 180);
          const x1 = cx + (outerRadius - 5) * Math.cos(angle);
          const y1 = cy + (outerRadius - 5) * Math.sin(angle);
          const x2 = cx + (outerRadius - 12) * Math.cos(angle);
          const y2 = cy + (outerRadius - 12) * Math.sin(angle);
          return (
            <Line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#D0CDE8"
              strokeWidth="1"
            />
          );
        })}

        {/* Needle */}
        <Line
          x1={cx}
          y1={cy}
          x2={needleEndX}
          y2={needleEndY}
          stroke="url(#needleGrad)"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* Needle base circle */}
        <Circle cx={cx} cy={cy} r="6" fill="#2d3436" />
        <Circle cx={cx} cy={cy} r="3" fill="#fff" />

        {/* Center percentage */}
        <SvgText
          x={cx}
          y={cy + 35}
          textAnchor="middle"
          fontSize="24"
          fontWeight="bold"
          fill="#2d3436">
          {Math.round(progress)}%
        </SvgText>
      </Svg>
    );
  };

  const needleRotation = needleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '270deg'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon name="compass-outline" size={24} color="#6c5ce7" />
        <Text style={styles.title}>Goal Alignment Ring</Text>
        <Text style={styles.subtitle}>{moodGoal?.vibe || 'Set a goal'}</Text>
      </View>

      <View style={styles.compassSection}>
        <Animated.View
          style={[
            styles.compassWrapper,
            {
              opacity: ringAnim,
              transform: [{scale: ringAnim}],
            },
          ]}>
          <CompassRing progress={progress} />
        </Animated.View>

        <Text style={styles.compassMessage}>{getCompassMessage(progress)}</Text>
      </View>

      {/* Next Steps */}
      <View style={styles.stepsSection}>
        <Text style={styles.stepsTitle}>Next Steps</Text>
        {nextSteps.map((step, idx) => (
          <View key={idx} style={styles.stepCard}>
            <Text style={styles.stepEmoji}>{step.emoji}</Text>
            <View style={styles.stepContent}>
              <Text style={styles.stepText}>{step.text}</Text>
              <Text style={styles.stepAction}>{step.action}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Goal Details */}
      <TouchableOpacity
        style={styles.detailsButton}
        onPress={() => setShowDetails(true)}>
        <Icon name="information-outline" size={16} color="#6c5ce7" />
        <Text style={styles.detailsButtonText}>View Goal Details</Text>
      </TouchableOpacity>

      {/* Details Modal */}
      <Modal
        visible={showDetails}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDetails(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Goal Alignment</Text>
              <TouchableOpacity
                onPress={() => setShowDetails(false)}
                style={styles.closeButton}>
                <Icon name="close" size={24} color="#2d3436" />
              </TouchableOpacity>
            </View>

            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Current Goal</Text>
                <Text style={styles.detailValue}>
                  {moodGoal?.vibe || 'Not set'}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Progress</Text>
                <Text style={[styles.detailValue, {color: '#6c5ce7'}]}>
                  {Math.round(progress)}%
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Total Entries</Text>
                <Text style={styles.detailValue}>
                  {analyticsData?.total_entries || 0}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Goal Vibes</Text>
                <Text style={styles.detailValue}>
                  {moodGoal?.vibes?.join(', ') || 'None'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowDetails(false)}>
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
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
  compassSection: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
  },
  compassWrapper: {
    marginBottom: 12,
  },
  compassMessage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6c5ce7',
  },
  stepsSection: {
    marginBottom: 16,
  },
  stepsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: 10,
  },
  stepCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    alignItems: 'flex-start',
    gap: 10,
  },
  stepEmoji: {
    fontSize: 18,
    marginTop: 2,
  },
  stepContent: {
    flex: 1,
  },
  stepText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2d3436',
    marginBottom: 4,
  },
  stepAction: {
    fontSize: 11,
    color: '#888',
    fontWeight: '500',
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  detailsButtonText: {
    color: '#6c5ce7',
    fontWeight: '600',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2d3436',
  },
  closeButton: {
    padding: 4,
  },
  detailsGrid: {
    marginBottom: 20,
  },
  detailItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EFF8',
  },
  detailLabel: {
    fontSize: 11,
    color: '#888',
    fontWeight: '500',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2d3436',
  },
  modalButton: {
    backgroundColor: '#6c5ce7',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default GoalAlignmentRing;
