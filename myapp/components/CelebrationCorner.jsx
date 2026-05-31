import React, {useEffect, useRef, useState, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  ScrollView,
  FlatList,
} from 'react-native';
import Svg, {
  G,
  Circle,
  Path,
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const BADGES = [
  {
    id: 'first-step',
    name: 'First Step',
    emoji: '🌟',
    description: 'Logged your first mood entry',
    condition: data => data.total_entries >= 1,
    color: '#FFD93D',
  },
  {
    id: '3-day-flame',
    name: '3-Day Flame',
    emoji: '🔥',
    description: '3 consecutive days of entries',
    condition: data => data.consecutive_days >= 3,
    color: '#FF6B6B',
  },
  {
    id: 'week-warrior',
    name: 'Week Warrior',
    emoji: '🏆',
    description: '7 consecutive days of entries',
    condition: data => data.consecutive_days >= 7,
    color: '#FFD93D',
  },
  {
    id: 'explorer',
    name: 'Explorer',
    emoji: '🌈',
    description: 'Experienced 5 unique moods',
    condition: data => (data.vibe_breakdown?.length || 0) >= 5,
    color: '#6BCB77',
  },
  {
    id: 'garden-keeper',
    name: 'Garden Keeper',
    emoji: '🌸',
    description: '7 plants blooming in your garden',
    condition: data => (data.vibe_breakdown?.length || 0) >= 7,
    color: '#FF8FB1',
  },
  {
    id: 'goal-achiever',
    name: 'Goal Achiever',
    emoji: '🎉',
    description: 'Reached your mood goal',
    condition: data => data.goal_completed,
    color: '#6c5ce7',
  },
  {
    id: 'gratitude-collector',
    name: 'Gratitude Collector',
    emoji: '🙏',
    description: 'Added 7 gratitudes to your jar',
    condition: data => data.gratitude_count >= 7,
    color: '#FFB7C5',
  },
  {
    id: 'reflection-master',
    name: 'Reflection Master',
    emoji: '📖',
    description: 'Written 10 journal entries',
    condition: data => data.journal_entries >= 10,
    color: '#95B8D1',
  },
  {
    id: 'mood-detective',
    name: 'Mood Detective',
    emoji: '🔍',
    description: 'Analyzed mood patterns',
    condition: data => data.analytics_viewed,
    color: '#D4A574',
  },
  {
    id: 'resilience-champion',
    name: 'Resilience Champion',
    emoji: '💪',
    description: 'Logged through challenging times',
    condition: data => data.challenging_entries >= 5,
    color: '#FF6B6B',
  },
];

const CelebrationCorner = ({analyticsData, moodHistory = []}) => {
  const [unlockedBadges, setUnlockedBadges] = useState([]);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [showBadgeDetail, setShowBadgeDetail] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const celebrationAnim = useRef(new Animated.Value(0)).current;
  const badgeAnimRefs = useRef({});

  // Calculate badge unlock conditions
  useEffect(() => {
    const challengingMoods = ['sad', 'anxious', 'gloomy', 'tense', 'lonely'];
    const challengingEntries = moodHistory.filter(item =>
      challengingMoods.includes(item.vibe?.toLowerCase()),
    ).length;

    const data = {
      total_entries: analyticsData?.total_entries || 0,
      consecutive_days: analyticsData?.consecutive_days || 0,
      vibe_breakdown: analyticsData?.vibe_breakdown || [],
      goal_completed: analyticsData?.goal_completed || false,
      gratitude_count: analyticsData?.gratitude_count || 0,
      journal_entries: moodHistory.filter(item => item.reflection).length,
      analytics_viewed: analyticsData?.total_entries > 0,
      challenging_entries: challengingEntries,
    };

    const unlocked = BADGES.filter(badge => badge.condition(data));
    setUnlockedBadges(unlocked);

    // Animate new unlocks
    if (unlocked.length > 0 && !badgeAnimRefs.current[unlocked[0].id]) {
      triggerCelebration();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyticsData, moodHistory]);

  const triggerCelebration = () => {
    celebrationAnim.setValue(0);
    Animated.sequence([
      Animated.spring(celebrationAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(celebrationAnim, {
        toValue: 0,
        duration: 2000,
        useNativeDriver: true,
      }),
    ]).start();
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 2500);
  };

  const BadgeIcon = ({badge, isUnlocked, index}) => {
    if (!badgeAnimRefs.current[badge.id]) {
      badgeAnimRefs.current[badge.id] = new Animated.Value(0);
    }
    const anim = badgeAnimRefs.current[badge.id];

    useEffect(() => {
      if (isUnlocked) {
        Animated.sequence([
          Animated.delay(index * 100),
          Animated.spring(anim, {
            toValue: 1,
            friction: 5,
            tension: 35,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }, [anim, isUnlocked, index]);

    return (
      <Animated.View
        style={[
          styles.badgeWrapper,
          {
            opacity: anim,
            transform: [{scale: anim}],
          },
        ]}>
        <TouchableOpacity
          style={[styles.badge, !isUnlocked && styles.badgeLockedContainer]}
          onPress={() => {
            if (isUnlocked) {
              setSelectedBadge(badge);
              setShowBadgeDetail(true);
            }
          }}
          activeOpacity={isUnlocked ? 0.7 : 1}>
          <View
            style={[
              styles.badgeCircle,
              {
                backgroundColor: isUnlocked ? badge.color : '#E8E6F5',
              },
            ]}>
            <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
          </View>
          {!isUnlocked && (
            <View style={styles.lockedOverlay}>
              <Icon name="lock" size={20} color="#999" />
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.badgeName} numberOfLines={2}>
          {badge.name}
        </Text>
      </Animated.View>
    );
  };

  const lockedCount = BADGES.length - unlockedBadges.length;
  const progressPercentage = (unlockedBadges.length / BADGES.length) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon name="medal" size={24} color="#FFD93D" />
        <Text style={styles.title}>Celebration Corner</Text>
        <Text style={styles.subtitle}>
          {unlockedBadges.length}/{BADGES.length} badges
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressBar}>
          <View
            style={[styles.progressFill, {width: `${progressPercentage}%`}]}
          />
        </View>
        <Text style={styles.progressText}>
          {Math.round(progressPercentage)}% Complete
        </Text>
      </View>

      {/* Badges Grid */}
      <ScrollView
        style={styles.badgesContainer}
        showsVerticalScrollIndicator={false}>
        <View style={styles.badgesGrid}>
          {BADGES.map((badge, idx) => {
            const isUnlocked = unlockedBadges.some(b => b.id === badge.id);
            return (
              <BadgeIcon
                key={badge.id}
                badge={badge}
                isUnlocked={isUnlocked}
                index={idx}
              />
            );
          })}
        </View>
      </ScrollView>

      {/* Stats */}
      <View style={styles.statsSection}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Unlocked</Text>
          <Text style={[styles.statValue, {color: '#6BCB77'}]}>
            {unlockedBadges.length}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Locked</Text>
          <Text style={[styles.statValue, {color: '#FF6B6B'}]}>
            {lockedCount}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Rarity</Text>
          <Text style={[styles.statValue, {color: '#FFD93D'}]}>
            {Math.round(progressPercentage)}%
          </Text>
        </View>
      </View>

      {/* Celebration Animation */}
      {showCelebration && (
        <Animated.View
          style={[
            styles.celebrationBadge,
            {
              opacity: celebrationAnim,
              transform: [{scale: celebrationAnim}],
            },
          ]}>
          <Text style={styles.celebrationText}>🎉 New Badge Unlocked!</Text>
        </Animated.View>
      )}

      {/* Badge Detail Modal */}
      <Modal
        visible={showBadgeDetail}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBadgeDetail(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedBadge && (
              <>
                <View
                  style={[
                    styles.modalBadgeCircle,
                    {backgroundColor: selectedBadge.color},
                  ]}>
                  <Text style={styles.modalBadgeEmoji}>
                    {selectedBadge.emoji}
                  </Text>
                </View>
                <Text style={styles.modalBadgeName}>{selectedBadge.name}</Text>
                <Text style={styles.modalBadgeDescription}>
                  {selectedBadge.description}
                </Text>

                <View style={styles.badgeInfoGrid}>
                  <View style={styles.badgeInfoItem}>
                    <Icon name="star" size={20} color={selectedBadge.color} />
                    <Text style={styles.badgeInfoText}>Rare Achievement</Text>
                  </View>
                  <View style={styles.badgeInfoItem}>
                    <Icon name="check-circle" size={20} color="#6BCB77" />
                    <Text style={styles.badgeInfoText}>Unlocked</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => setShowBadgeDetail(false)}>
                  <Text style={styles.modalButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
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
  progressSection: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E8E6F5',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6c5ce7',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 11,
    color: '#888',
    fontWeight: '500',
    textAlign: 'right',
  },
  badgesContainer: {
    maxHeight: 350,
    marginBottom: 16,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 12,
  },
  badgeWrapper: {
    alignItems: 'center',
    width: '23%',
  },
  badge: {
    marginBottom: 8,
  },
  badgeLockedContainer: {
    opacity: 0.5,
  },
  badgeCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeEmoji: {
    fontSize: 28,
  },
  lockedOverlay: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  badgeName: {
    fontSize: 9,
    fontWeight: '600',
    color: '#555',
    textAlign: 'center',
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: '#888',
    fontWeight: '500',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  celebrationBadge: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: '#FFD93D',
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
  },
  celebrationText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2d3436',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '80%',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  modalBadgeCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalBadgeEmoji: {
    fontSize: 40,
  },
  modalBadgeName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2d3436',
    marginBottom: 8,
  },
  modalBadgeDescription: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  badgeInfoGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F0EFF8',
  },
  badgeInfoItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  badgeInfoText: {
    fontSize: 11,
    color: '#555',
    fontWeight: '500',
  },
  modalButton: {
    backgroundColor: '#6c5ce7',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default CelebrationCorner;
