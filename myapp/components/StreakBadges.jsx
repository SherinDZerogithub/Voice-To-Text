import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// ─── Badge catalogue ──────────────────────────────────────────────────────────

const BADGES = [
  // Streak badges
  {
    id: 'first_step',
    icon: 'shoe-print',
    label: 'First Step',
    description: 'Logged your very first mood. The journey begins.',
    color: '#A8E6CF',
    condition: ({totalLogs}) => totalLogs >= 1,
    tier: 'bronze',
  },
  {
    id: 'streak_3',
    icon: 'fire',
    label: '3-Day Flame',
    description: 'Checked in 3 days in a row. You\'re building a habit.',
    color: '#FFD93D',
    condition: ({streak}) => streak >= 3,
    tier: 'bronze',
  },
  {
    id: 'streak_7',
    icon: 'weather-sunny',
    label: 'Week Warrior',
    description: '7 consecutive days of self-reflection. Extraordinary.',
    color: '#FFB347',
    condition: ({streak}) => streak >= 7,
    tier: 'silver',
  },
  {
    id: 'streak_14',
    icon: 'moon-waning-crescent',
    label: 'Fortnight Soul',
    description: '14 days strong. Your consistency is becoming identity.',
    color: '#B8C0FF',
    condition: ({streak}) => streak >= 14,
    tier: 'silver',
  },
  {
    id: 'streak_30',
    icon: 'crown',
    label: 'Month of You',
    description: '30 days straight. You have made self-care a practice.',
    color: '#FEE440',
    condition: ({streak}) => streak >= 30,
    tier: 'gold',
  },
  // Log volume badges
  {
    id: 'logs_10',
    icon: 'book-open-variant',
    label: 'Journal Keeper',
    description: '10 mood entries — your journal is growing.',
    color: '#D4F1F4',
    condition: ({totalLogs}) => totalLogs >= 10,
    tier: 'bronze',
  },
  {
    id: 'logs_25',
    icon: 'star-shooting',
    label: 'Story Builder',
    description: '25 entries. Each one a breadcrumb to who you are.',
    color: '#A2D2FF',
    condition: ({totalLogs}) => totalLogs >= 25,
    tier: 'silver',
  },
  {
    id: 'logs_50',
    icon: 'bookshelf',
    label: 'Inner Archive',
    description: '50 entries. Your emotional library is substantial.',
    color: '#9D4EDD',
    condition: ({totalLogs}) => totalLogs >= 50,
    tier: 'gold',
  },
  // Variety badges
  {
    id: 'explorer',
    icon: 'compass-rose',
    label: 'Mood Explorer',
    description: 'Logged 5 different vibes. You contain multitudes.',
    color: '#6BCB77',
    condition: ({uniqueVibes}) => uniqueVibes >= 5,
    tier: 'bronze',
  },
  {
    id: 'spectrum',
    icon: 'palette',
    label: 'Full Spectrum',
    description: 'Logged 10+ distinct emotional states. Richly alive.',
    color: '#FF8B94',
    condition: ({uniqueVibes}) => uniqueVibes >= 10,
    tier: 'silver',
  },
  // Consistency
  {
    id: 'comeback',
    icon: 'heart-flash',
    label: 'Comeback',
    description: 'Returned after a break and kept going. That takes courage.',
    color: '#D4A5A5',
    condition: ({hadBreakAndReturned}) => hadBreakAndReturned,
    tier: 'bronze',
  },
  {
    id: 'night_owl',
    icon: 'owl',
    label: 'Night Owl',
    description: 'Logged a mood after 10 PM. The quiet hours count too.',
    color: '#4A4E69',
    condition: ({hasNightEntry}) => hasNightEntry,
    tier: 'bronze',
  },
  {
    id: 'early_bird',
    icon: 'weather-sunset-up',
    label: 'Early Bird',
    description: 'Logged a mood before 7 AM. Morning clarity is rare.',
    color: '#FFD93D',
    condition: ({hasEarlyEntry}) => hasEarlyEntry,
    tier: 'bronze',
  },
];

const TIER_COLORS = {
  bronze: {bg: '#CD7F32', text: '#fff', label: 'Bronze'},
  silver: {bg: '#A8A9AD', text: '#fff', label: 'Silver'},
  gold:   {bg: '#FFD700', text: '#3d3200', label: 'Gold'},
};

// ─── Absence messages (days away → message) ──────────────────────────────────

const getAbsenceMessage = (daysAway, userName) => {
  const name = userName ? `, ${userName.split(' ')[0]}` : '';
  if (daysAway === 1) {
    return {
      icon: 'hand-wave',
      color: '#A8E6CF',
      title: `Welcome back${name} 👋`,
      body: "You were away yesterday — no pressure, just glad you're here.",
    };
  }
  if (daysAway === 2) {
    return {
      icon: 'coffee-outline',
      color: '#FFDE7D',
      title: 'Two days away',
      body: `Hey${name} — a couple of days off is fine. How are you feeling today?`,
    };
  }
  if (daysAway <= 5) {
    return {
      icon: 'cloud-outline',
      color: '#A2D2FF',
      title: `${daysAway} days since your last check-in`,
      body: `Life gets busy${name}. Even a small note counts — what's on your mind?`,
    };
  }
  if (daysAway <= 14) {
    return {
      icon: 'heart-outline',
      color: '#FFB7B2',
      title: `It's been a while${name}`,
      body: `You stepped away for ${daysAway} days. That's okay. You're here now — that's what matters.`,
    };
  }
  return {
    icon: 'star-outline',
    color: '#B8C0FF',
    title: 'Long time, no see',
    body: `${daysAway} days have passed. Welcome back${name}. This space is still yours.`,
  };
};

// ─── Stats calculation ────────────────────────────────────────────────────────

const computeStats = (moodHistory) => {
  if (!moodHistory || moodHistory.length === 0) {
    return {
      streak: 0,
      longestStreak: 0,
      totalLogs: 0,
      uniqueVibes: 0,
      daysAway: 0,
      hadBreakAndReturned: false,
      hasNightEntry: false,
      hasEarlyEntry: false,
    };
  }

  const now = new Date();

  // Unique days logged (date strings)
  const daySet = new Set();
  const vibeSet = new Set();
  let hasNightEntry = false;
  let hasEarlyEntry = false;

  moodHistory.forEach(item => {
    const d = item.rawTimestamp ? new Date(item.rawTimestamp) : null;
    if (d) {
      daySet.add(d.toDateString());
      const h = d.getHours();
      if (h >= 22) hasNightEntry = true;
      if (h < 7) hasEarlyEntry = true;
    }
    if (item.vibe) vibeSet.add(item.vibe.toLowerCase());
  });

  // Sort unique days ascending
  const sortedDays = Array.from(daySet)
    .map(ds => new Date(ds))
    .sort((a, b) => a - b);

  // Current streak (counting backwards from today)
  let streak = 0;
  const todayStr = now.toDateString();
  const yesterdayStr = new Date(now - 86400000).toDateString();
  const daySets = new Set(sortedDays.map(d => d.toDateString()));

  const latestDay = sortedDays[sortedDays.length - 1];
  const latestStr = latestDay ? latestDay.toDateString() : null;

  // Check if logged today or yesterday (streak still alive)
  if (latestStr === todayStr || latestStr === yesterdayStr) {
    let checkDate = latestDay ? new Date(latestDay) : new Date(now);
    while (daySets.has(checkDate.toDateString())) {
      streak++;
      checkDate = new Date(checkDate - 86400000);
    }
  }

  // Longest streak
  let longestStreak = 0;
  let current = 0;
  for (let i = 0; i < sortedDays.length; i++) {
    if (i === 0) {
      current = 1;
    } else {
      const diff = (sortedDays[i] - sortedDays[i - 1]) / 86400000;
      if (Math.round(diff) === 1) {
        current++;
      } else {
        longestStreak = Math.max(longestStreak, current);
        current = 1;
      }
    }
  }
  longestStreak = Math.max(longestStreak, current);

  // Days away
  let daysAway = 0;
  if (latestDay) {
    const msAway = now - latestDay;
    daysAway = Math.floor(msAway / 86400000);
    // If they logged today, daysAway = 0
    if (latestStr === todayStr) daysAway = 0;
  }

  // Had a break and returned: longest gap > 2 days but user has recent entry
  let hadBreakAndReturned = false;
  for (let i = 1; i < sortedDays.length; i++) {
    const gap = (sortedDays[i] - sortedDays[i - 1]) / 86400000;
    if (gap > 2) {
      hadBreakAndReturned = true;
      break;
    }
  }

  return {
    streak,
    longestStreak,
    totalLogs: moodHistory.length,
    uniqueVibes: vibeSet.size,
    daysAway,
    hadBreakAndReturned,
    hasNightEntry,
    hasEarlyEntry,
  };
};

// ─── BadgeCard ────────────────────────────────────────────────────────────────

const BadgeCard = ({badge, earned, onPress, delay = 0}) => {
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 70,
        friction: 8,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const tierInfo = TIER_COLORS[badge.tier] || TIER_COLORS.bronze;

  return (
    <Animated.View style={{opacity: opacityAnim, transform: [{scale: scaleAnim}]}}>
      <TouchableOpacity
        onPress={() => onPress(badge)}
        style={[
          styles.badgeCard,
          earned
            ? {backgroundColor: badge.color + '22', borderColor: badge.color}
            : styles.badgeCardLocked,
        ]}
        activeOpacity={0.8}>
        {/* Icon */}
        <View
          style={[
            styles.badgeIconWrap,
            {backgroundColor: earned ? badge.color + '30' : '#f0f0f0'},
          ]}>
          <Icon
            name={badge.icon}
            size={22}
            color={earned ? badge.color : '#ccc'}
          />
          {!earned && (
            <View style={styles.lockOverlay}>
              <Icon name="lock-outline" size={10} color="#bbb" />
            </View>
          )}
        </View>

        {/* Label */}
        <Text
          style={[styles.badgeLabel, {color: earned ? '#2d3436' : '#ccc'}]}
          numberOfLines={2}>
          {badge.label}
        </Text>

        {/* Tier chip */}
        {earned && (
          <View style={[styles.tierChip, {backgroundColor: tierInfo.bg}]}>
            <Text style={[styles.tierText, {color: tierInfo.text}]}>
              {tierInfo.label}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Badge Detail Modal ───────────────────────────────────────────────────────

const BadgeModal = ({badge, earned, visible, onClose}) => {
  if (!badge) return null;
  const tierInfo = TIER_COLORS[badge.tier] || TIER_COLORS.bronze;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}>
        <View style={[styles.modalCard, {borderColor: badge.color}]}>
          <View
            style={[
              styles.modalIconWrap,
              {backgroundColor: earned ? badge.color + '30' : '#f5f5f5'},
            ]}>
            <Icon name={badge.icon} size={40} color={earned ? badge.color : '#ddd'} />
          </View>
          <Text style={styles.modalTitle}>{badge.label}</Text>
          <View style={[styles.tierChipLg, {backgroundColor: tierInfo.bg}]}>
            <Text style={[styles.tierTextLg, {color: tierInfo.text}]}>
              {tierInfo.label} Badge
            </Text>
          </View>
          <Text style={styles.modalDesc}>{badge.description}</Text>
          {!earned && (
            <View style={styles.modalLockedNote}>
              <Icon name="lock-outline" size={13} color="#bbb" />
              <Text style={styles.modalLockedText}>Not yet earned</Text>
            </View>
          )}
          <TouchableOpacity style={styles.modalClose} onPress={onClose}>
            <Text style={styles.modalCloseText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const StreakBadges = ({moodHistory, userName, appBgColor, onPressBadge}) => {
  const stats = useMemo(() => computeStats(moodHistory), [moodHistory]);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [absenceDismissed, setAbsenceDismissed] = useState(false);
  const [showAllBadges, setShowAllBadges] = useState(false);

  // Absence banner slide-in
  const absenceSlide = useRef(new Animated.Value(-40)).current;
  const absenceOpacity = useRef(new Animated.Value(0)).current;

  const showAbsence = stats.daysAway >= 1 && !absenceDismissed;
  const absenceInfo = showAbsence
    ? getAbsenceMessage(stats.daysAway, userName)
    : null;

  useEffect(() => {
    if (showAbsence) {
      Animated.parallel([
        Animated.spring(absenceSlide, {
          toValue: 0,
          tension: 50,
          friction: 9,
          delay: 300,
          useNativeDriver: true,
        }),
        Animated.timing(absenceOpacity, {
          toValue: 1,
          duration: 400,
          delay: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showAbsence]);

  const earnedBadges = useMemo(
    () => BADGES.filter(b => b.condition(stats)),
    [stats],
  );

  const handleBadgePress = badge => {
    setSelectedBadge(badge);
    onPressBadge && onPressBadge(badge);
  };

  const dismissAbsence = () => {
    Animated.parallel([
      Animated.timing(absenceSlide, {toValue: -40, duration: 250, useNativeDriver: true}),
      Animated.timing(absenceOpacity, {toValue: 0, duration: 200, useNativeDriver: true}),
    ]).start(() => setAbsenceDismissed(true));
  };

  // Preview: show earned first, then locked up to 8 total
  const previewBadges = useMemo(() => {
    const earned = BADGES.filter(b => b.condition(stats));
    const locked = BADGES.filter(b => !b.condition(stats));
    const combined = [...earned, ...locked];
    return showAllBadges ? combined : combined.slice(0, 8);
  }, [stats, showAllBadges]);

  if (!moodHistory || moodHistory.length === 0) return null;

  return (
    <View style={styles.container}>

      {/* ── Absence Banner ── */}
      {showAbsence && absenceInfo && (
        <Animated.View
          style={[
            styles.absenceBanner,
            {borderColor: absenceInfo.color},
            {
              opacity: absenceOpacity,
              transform: [{translateY: absenceSlide}],
            },
          ]}>
          <View style={[styles.absenceIcon, {backgroundColor: absenceInfo.color + '25'}]}>
            <Icon name={absenceInfo.icon} size={20} color={absenceInfo.color} />
          </View>
          <View style={styles.absenceText}>
            <Text style={styles.absenceTitle}>{absenceInfo.title}</Text>
            <Text style={styles.absenceBody}>{absenceInfo.body}</Text>
          </View>
          <TouchableOpacity onPress={dismissAbsence} hitSlop={{top: 8, right: 8, bottom: 8, left: 8}}>
            <Icon name="close" size={15} color="#ccc" />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ── Streak + Stats Row ── */}
      <View style={styles.statsRow}>
        {/* Current streak */}
        <View style={[styles.statPill, styles.streakPill]}>
          <Icon name="fire" size={18} color={stats.streak >= 3 ? '#FF6B35' : '#ccc'} />
          <Text style={[styles.streakNum, {color: stats.streak >= 3 ? '#FF6B35' : '#999'}]}>
            {stats.streak}
          </Text>
          <Text style={styles.statLabel}>day streak</Text>
        </View>

        {/* Total logs */}
        <View style={styles.statPill}>
          <Icon name="book-open-variant" size={15} color="#6c5ce7" />
          <Text style={styles.statNum}>{stats.totalLogs}</Text>
          <Text style={styles.statLabel}>entries</Text>
        </View>

        {/* Badges earned */}
        <View style={styles.statPill}>
          <Icon name="medal" size={15} color="#FFD700" />
          <Text style={styles.statNum}>{earnedBadges.length}</Text>
          <Text style={styles.statLabel}>badges</Text>
        </View>

        {/* Unique vibes */}
        <View style={styles.statPill}>
          <Icon name="palette" size={15} color="#6BCB77" />
          <Text style={styles.statNum}>{stats.uniqueVibes}</Text>
          <Text style={styles.statLabel}>vibes</Text>
        </View>
      </View>

      {/* ── Badges Grid ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Your Badges</Text>
        <TouchableOpacity onPress={() => setShowAllBadges(v => !v)}>
          <Text style={styles.seeAll}>
            {showAllBadges ? 'Show less' : `See all ${BADGES.length}`}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.badgesGrid}>
        {previewBadges.map((badge, i) => (
          <BadgeCard
            key={badge.id}
            badge={badge}
            earned={badge.condition(stats)}
            onPress={handleBadgePress}
            delay={i * 40}
          />
        ))}
      </View>

      {/* ── Badge Detail Modal ── */}
      <BadgeModal
        badge={selectedBadge}
        earned={selectedBadge ? selectedBadge.condition(stats) : false}
        visible={!!selectedBadge}
        onClose={() => setSelectedBadge(null)}
      />
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 20,
  },

  // ── Absence banner
  absenceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 14,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  absenceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  absenceText: {flex: 1},
  absenceTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2d3436',
    marginBottom: 2,
  },
  absenceBody: {
    fontSize: 12,
    color: '#666',
    lineHeight: 17,
  },

  // ── Stats row
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statPill: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderColor: '#eee',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  streakPill: {
    borderColor: '#FFD93D40',
    backgroundColor: '#FFFDF0',
  },
  streakNum: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  statNum: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2d3436',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 9,
    color: '#aaa',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ── Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2d3436',
    letterSpacing: -0.2,
  },
  seeAll: {
    fontSize: 12,
    color: '#6c5ce7',
    fontWeight: '700',
  },

  // ── Badges grid
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badgeCard: {
    width: '22.5%',
    aspectRatio: 0.85,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    gap: 5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  badgeCardLocked: {
    backgroundColor: '#fafafa',
    borderColor: '#eee',
  },
  badgeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  lockOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 2,
  },
  badgeLabel: {
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 12,
  },
  tierChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tierText: {
    fontSize: 8,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // ── Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 2,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  modalIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#2d3436',
    textAlign: 'center',
  },
  tierChipLg: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  tierTextLg: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalDesc: {
    fontSize: 14,
    color: '#555',
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 4,
  },
  modalLockedNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  modalLockedText: {
    fontSize: 12,
    color: '#bbb',
    fontWeight: '600',
  },
  modalClose: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: '#6c5ce7',
    borderRadius: 20,
  },
  modalCloseText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default StreakBadges;