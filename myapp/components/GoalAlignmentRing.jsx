import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import Svg, {Circle, Defs, LinearGradient, Stop} from 'react-native-svg';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const GOAL_WINDOW_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const getGoalWindowStatus = moodGoal => {
  const updatedAt = moodGoal?.updated_at ? new Date(moodGoal.updated_at) : null;
  if (!updatedAt || Number.isNaN(updatedAt.getTime())) {
    return {daysElapsed: 0, daysRemaining: GOAL_WINDOW_DAYS};
  }
  const elapsedMs = Math.max(0, Date.now() - updatedAt.getTime());
  const daysElapsed = Math.floor(elapsedMs / MS_PER_DAY);
  return {
    daysElapsed: Math.min(daysElapsed, GOAL_WINDOW_DAYS),
    daysRemaining: Math.max(0, GOAL_WINDOW_DAYS - daysElapsed),
  };
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const ProgressRing = ({progress, color}) => {
  const size = 160;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  const animVal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animVal, {
      toValue: progress,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const dashOffset = animVal.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  return (
    <View style={{width: size, height: size}}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="progGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={color} stopOpacity="1" />
            <Stop offset="100%" stopColor={color + 'AA'} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        {/* Track */}
        <Circle
          cx={cx} cy={cy} r={radius}
          fill="none"
          stroke="#EDE9FF"
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <AnimatedCircle
          cx={cx} cy={cy} r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </Svg>
      {/* Center content */}
      <View style={styles.ringCenter}>
        <Text style={[styles.ringPercent, {color}]}>{Math.round(progress)}%</Text>
        <Text style={styles.ringLabel}>aligned</Text>
      </View>
    </View>
  );
};

const GoalAlignmentRing = ({moodGoal, analyticsData, onGoalUpdate}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!moodGoal?.vibes && !moodGoal?.vibe) {
      setProgress(0);
      return;
    }
    const goalVibes = Array.isArray(moodGoal.vibes)
      ? moodGoal.vibes
      : [moodGoal.vibe].filter(Boolean);

    const freqData = analyticsData?.mood_frequency || {};
    const vibeBreakdown = analyticsData?.vibe_breakdown || [];
    const totalEntries = analyticsData?.total_entries || 1;

    // Count matching entries from vibe_breakdown or mood_frequency
    let goalEntries = vibeBreakdown
      .filter(v => goalVibes.includes(v.label?.toLowerCase()))
      .reduce((sum, v) => sum + (v.count || 0), 0);

    if (goalEntries === 0) {
      goalEntries = goalVibes.reduce((sum, v) => sum + (freqData[v] || 0), 0);
    }

    const calculated = Math.min((goalEntries / Math.max(totalEntries * 0.5, 5)) * 100, 100);
    setProgress(calculated);
  }, [moodGoal, analyticsData]);

  const {daysElapsed, daysRemaining} = getGoalWindowStatus(moodGoal);

  const goalVibes = Array.isArray(moodGoal?.vibes)
    ? moodGoal.vibes
    : [moodGoal?.vibe].filter(Boolean);

  const getStatusInfo = p => {
    if (!moodGoal?.vibe && !moodGoal?.vibes?.length)
      return {emoji: '🎯', text: 'No goal set yet', color: '#aaa', tip: 'Tap the goal button above to set a mood goal'};
    if (p >= 100)
      return {emoji: '🏆', text: 'Goal achieved!', color: '#00b894', tip: "You've hit your target. Incredible work!"};
    if (p >= 70)
      return {emoji: '🔥', text: 'Almost there', color: '#f39c12', tip: 'Keep it up — you\'re so close!'};
    if (p >= 40)
      return {emoji: '💪', text: 'Good progress', color: '#6c5ce7', tip: 'You\'re on track. Log more to keep momentum.'};
    return {emoji: '🌱', text: 'Just starting', color: '#74b9ff', tip: 'Every entry counts. You\'ve got this!'};
  };

  const status = getStatusInfo(progress);

  // Day dots
  const dayDots = Array.from({length: GOAL_WINDOW_DAYS}, (_, i) => i < daysElapsed);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIconWrap}>
          <Icon name="flag-checkered" size={18} color="#6c5ce7" />
        </View>
        <View style={{flex: 1}}>
          <Text style={styles.title}>Your Feel-Good Goal</Text>
          <Text style={styles.subtitle}>
            {goalVibes.length > 0 ? goalVibes.join(' · ') : 'Not set'}
          </Text>
        </View>
        {onGoalUpdate && (
          <TouchableOpacity style={styles.editBtn} onPress={onGoalUpdate}>
            <Icon name="pencil-outline" size={15} color="#6c5ce7" />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Main content */}
      <View style={styles.body}>
        {/* Progress ring */}
        <View style={styles.ringWrap}>
          <ProgressRing progress={progress} color={status.color} />
        </View>

        {/* Right side info */}
        <View style={styles.infoCol}>
          <View style={[styles.statusChip, {backgroundColor: status.color + '18', borderColor: status.color + '40'}]}>
            <Text style={styles.statusEmoji}>{status.emoji}</Text>
            <Text style={[styles.statusText, {color: status.color}]}>{status.text}</Text>
          </View>

          <Text style={styles.tip}>{status.tip}</Text>

          {/* 7-day progress dots */}
          <View style={styles.dotsSection}>
            <Text style={styles.dotsLabel}>7-day window</Text>
            <View style={styles.dots}>
              {dayDots.map((filled, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    {backgroundColor: filled ? status.color : '#EDE9FF'},
                    i === daysElapsed - 1 && filled && {borderWidth: 2, borderColor: status.color},
                  ]}
                />
              ))}
            </View>
            <Text style={styles.daysText}>
              {daysRemaining > 0 ? `${daysRemaining}d remaining` : 'Window complete'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    marginVertical: 8,
    shadowColor: '#6c5ce7',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#6c5ce710',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {fontSize: 15, fontWeight: '800', color: '#2d3436'},
  subtitle: {fontSize: 12, color: '#888', fontWeight: '600', marginTop: 1},
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#6c5ce710',
    borderWidth: 1,
    borderColor: '#6c5ce720',
  },
  editBtnText: {fontSize: 12, color: '#6c5ce7', fontWeight: '700'},
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  ringWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringPercent: {fontSize: 26, fontWeight: '900'},
  ringLabel: {fontSize: 11, color: '#aaa', fontWeight: '600', marginTop: -2},
  infoCol: {flex: 1, gap: 10},
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  statusEmoji: {fontSize: 16},
  statusText: {fontSize: 13, fontWeight: '800'},
  tip: {fontSize: 12, color: '#666', fontWeight: '500', lineHeight: 17},
  dotsSection: {gap: 5},
  dotsLabel: {fontSize: 10, color: '#aaa', fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase'},
  dots: {flexDirection: 'row', gap: 5},
  dot: {width: 10, height: 10, borderRadius: 5},
  daysText: {fontSize: 11, color: '#aaa', fontWeight: '600'},
});

export default GoalAlignmentRing;
