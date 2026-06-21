import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, {Circle, Defs, LinearGradient, Path, Stop} from 'react-native-svg';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const {width} = Dimensions.get('window');

// ── Badge catalogue ────────────────────────────────────────────────────────────
const BADGES = [
  {id: 'first_step',  icon: 'shoe-print',         label: 'First Step',     description: 'Logged your very first mood. Every journey starts here.',             color: '#6BCB77', bg: '#E8F8EA', tier: 'bronze', condition: ({totalLogs})          => totalLogs >= 1},
  {id: 'streak_3',    icon: 'fire',                label: '3-Day Flame',    description: 'Checked in 3 days in a row. You\'re building a real habit.',          color: '#FF9F43', bg: '#FFF0DC', tier: 'bronze', condition: ({streak})             => streak >= 3},
  {id: 'streak_7',    icon: 'weather-sunny',       label: 'Week Warrior',   description: '7 consecutive check-ins. You\'re showing up for yourself.',           color: '#FFD93D', bg: '#FFFDE7', tier: 'silver', condition: ({streak})             => streak >= 7},
  {id: 'streak_14',   icon: 'moon-waning-crescent',label: 'Fortnight Soul', description: '14 days of self-reflection. Your consistency is becoming identity.',  color: '#B8C0FF', bg: '#EEEEFF', tier: 'silver', condition: ({streak})             => streak >= 14},
  {id: 'streak_30',   icon: 'crown',               label: 'Month of You',   description: '30 days straight. You\'ve made self-care a daily practice.',          color: '#FFD700', bg: '#FFFAE0', tier: 'gold',   condition: ({streak})             => streak >= 30},
  {id: 'logs_10',     icon: 'book-open-variant',   label: 'Journal Keeper', description: '10 mood entries — your emotional journal is growing.',                color: '#4D96FF', bg: '#E3EEFF', tier: 'bronze', condition: ({totalLogs})          => totalLogs >= 10},
  {id: 'logs_25',     icon: 'star-shooting',       label: 'Story Builder',  description: '25 entries. Each one a page in your story.',                          color: '#A2D2FF', bg: '#EBF5FF', tier: 'silver', condition: ({totalLogs})          => totalLogs >= 25},
  {id: 'logs_50',     icon: 'bookshelf',           label: 'Inner Archive',  description: '50 entries. You have built a substantial emotional library.',          color: '#9D4EDD', bg: '#F3EAFF', tier: 'gold',   condition: ({totalLogs})          => totalLogs >= 50},
  {id: 'explorer',    icon: 'compass-rose',        label: 'Mood Explorer',  description: 'Logged 5 different vibes. You contain multitudes.',                   color: '#6BCB77', bg: '#E8F8EA', tier: 'bronze', condition: ({uniqueVibes})        => uniqueVibes >= 5},
  {id: 'spectrum',    icon: 'palette',             label: 'Full Spectrum',  description: 'Logged 10+ distinct emotional states. Richly alive.',                 color: '#FF8B94', bg: '#FFF0F1', tier: 'silver', condition: ({uniqueVibes})        => uniqueVibes >= 10},
  {id: 'comeback',    icon: 'heart-flash',         label: 'Comeback',       description: 'Returned after a break and kept going. That takes courage.',          color: '#D4A5A5', bg: '#FDF0F0', tier: 'bronze', condition: ({hadBreakAndReturned})=> hadBreakAndReturned},
  {id: 'night_owl',   icon: 'owl',                 label: 'Night Owl',      description: 'Logged a mood after 10 PM. The quiet hours count too.',               color: '#4A4E69', bg: '#EEEEF5', tier: 'bronze', condition: ({hasNightEntry})      => hasNightEntry},
  {id: 'early_bird',  icon: 'weather-sunset-up',   label: 'Early Bird',     description: 'Logged a mood before 7 AM. Morning clarity is rare.',                color: '#FFD93D', bg: '#FFFDE7', tier: 'bronze', condition: ({hasEarlyEntry})      => hasEarlyEntry},
];

const TIERS = {
  bronze: {gradient: ['#CD7F32', '#E8A87C'], label: 'Bronze', textColor: '#fff'},
  silver: {gradient: ['#9EA7AD', '#C8D6DF'], label: 'Silver', textColor: '#fff'},
  gold:   {gradient: ['#F7C948', '#FFE17B'], label: 'Gold',   textColor: '#3d3200'},
};

// ── Stats ──────────────────────────────────────────────────────────────────────
const computeStats = moodHistory => {
  if (!moodHistory?.length) return {streak:0, longestStreak:0, totalLogs:0, uniqueVibes:0, daysAway:0, hadBreakAndReturned:false, hasNightEntry:false, hasEarlyEntry:false};

  const now = new Date();
  const daySet = new Set();
  const vibeSet = new Set();
  let hasNightEntry = false, hasEarlyEntry = false;

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

  const sortedDays = Array.from(daySet).map(ds => new Date(ds)).sort((a, b) => a - b);
  const daySets = new Set(sortedDays.map(d => d.toDateString()));
  const todayStr = now.toDateString();
  const yesterdayStr = new Date(now - 86400000).toDateString();
  const latestDay = sortedDays[sortedDays.length - 1];
  const latestStr = latestDay?.toDateString();

  let streak = 0;
  if (latestStr === todayStr || latestStr === yesterdayStr) {
    let checkDate = new Date(latestDay);
    while (daySets.has(checkDate.toDateString())) {
      streak++;
      checkDate = new Date(checkDate - 86400000);
    }
  }

  let longestStreak = 0, current = 0;
  for (let i = 0; i < sortedDays.length; i++) {
    if (i === 0) { current = 1; }
    else {
      const diff = (sortedDays[i] - sortedDays[i - 1]) / 86400000;
      if (Math.round(diff) === 1) { current++; } else { longestStreak = Math.max(longestStreak, current); current = 1; }
    }
  }
  longestStreak = Math.max(longestStreak, current);

  let daysAway = latestDay ? Math.floor((now - latestDay) / 86400000) : 0;
  if (latestStr === todayStr) daysAway = 0;

  let hadBreakAndReturned = false;
  for (let i = 1; i < sortedDays.length; i++) {
    if ((sortedDays[i] - sortedDays[i - 1]) / 86400000 > 2) { hadBreakAndReturned = true; break; }
  }

  return {streak, longestStreak, totalLogs: moodHistory.length, uniqueVibes: vibeSet.size, daysAway, hadBreakAndReturned, hasNightEntry, hasEarlyEntry};
};

// ── Absence banner ─────────────────────────────────────────────────────────────
const getAbsenceMessage = (daysAway, userName) => {
  const name = userName ? `, ${userName.split(' ')[0]}` : '';
  if (daysAway === 1) return {icon: 'hand-wave', color: '#6BCB77', title: `Welcome back${name} 👋`, body: "You were away yesterday — no pressure, just glad you're here."};
  if (daysAway === 2) return {icon: 'coffee-outline', color: '#FFD93D', title: 'Two days away', body: `Hey${name} — a couple of days off is fine. How are you feeling today?`};
  if (daysAway <= 5) return {icon: 'cloud-outline', color: '#4D96FF', title: `${daysAway} days since your last check-in`, body: `Life gets busy${name}. Even a small note counts — what's on your mind?`};
  if (daysAway <= 14) return {icon: 'heart-outline', color: '#FF8FB1', title: `It's been a while${name}`, body: `You stepped away for ${daysAway} days. That's okay. You're here now.`};
  return {icon: 'star-outline', color: '#B8C0FF', title: 'Long time, no see', body: `${daysAway} days have passed. Welcome back${name}. This space is still yours.`};
};

// ── Circular progress ──────────────────────────────────────────────────────────
const CircularProgress = ({value, max, color, size = 64, strokeWidth = 6}) => {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = Math.min(value / max, 1);
  const dashoffset = circumference * (1 - progress);

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <LinearGradient id={`prog_${color.replace('#','')}`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <Stop offset="100%" stopColor={color} />
        </LinearGradient>
      </Defs>
      <Circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#eee" strokeWidth={strokeWidth} />
      <Circle
        cx={size/2} cy={size/2} r={r}
        fill="none"
        stroke={`url(#prog_${color.replace('#','')})`}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={dashoffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
      />
    </Svg>
  );
};

// ── Big stat card ──────────────────────────────────────────────────────────────
const StatCard = ({icon, value, label, color, bgColor, progress, maxProgress, animDelay = 0}) => {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {toValue: 1, tension: 80, friction: 10, delay: animDelay, useNativeDriver: true}),
      Animated.timing(opacityAnim, {toValue: 1, duration: 300, delay: animDelay, useNativeDriver: true}),
    ]).start();
  }, []);

  return (
    <Animated.View style={[statStyles.card, {backgroundColor: bgColor, opacity: opacityAnim, transform: [{scale: scaleAnim}]}]}>
      {progress !== undefined && (
        <View style={statStyles.progressWrap}>
          <CircularProgress value={value} max={maxProgress} color={color} size={52} strokeWidth={5} />
          <View style={statStyles.progressCenter}>
            <Icon name={icon} size={16} color={color} />
          </View>
        </View>
      )}
      {progress === undefined && (
        <View style={[statStyles.iconWrap, {backgroundColor: color + '20'}]}>
          <Icon name={icon} size={18} color={color} />
        </View>
      )}
      <Text style={[statStyles.value, {color}]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </Animated.View>
  );
};

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    gap: 4,
    minHeight: 88,
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  progressWrap: {position: 'relative', alignItems: 'center', justifyContent: 'center'},
  progressCenter: {position: 'absolute'},
  iconWrap: {width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center'},
  value: {fontSize: 22, fontWeight: '900', letterSpacing: -0.5},
  label: {fontSize: 9, color: '#aaa', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center'},
});

// ── Badge card ─────────────────────────────────────────────────────────────────
const BadgeCard = ({badge, earned, onPress, delay = 0}) => {
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const shineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {toValue: 1, tension: 80, friction: 9, delay, useNativeDriver: true}),
      Animated.timing(opacityAnim, {toValue: 1, duration: 300, delay, useNativeDriver: true}),
    ]).start(() => {
      if (earned) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(shineAnim, {toValue: 1, duration: 2000, delay: 1000, useNativeDriver: true}),
            Animated.timing(shineAnim, {toValue: 0, duration: 800, useNativeDriver: true}),
          ])
        ).start();
      }
    });
  }, [earned]);

  const tier = TIERS[badge.tier] || TIERS.bronze;

  const glowStyle = earned && {
    shadowColor: badge.color,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: shineAnim.interpolate({inputRange: [0, 1], outputRange: [0.15, 0.5]}),
    shadowRadius: shineAnim.interpolate({inputRange: [0, 1], outputRange: [4, 12]}),
    elevation: 4,
  };

  return (
    <Animated.View style={[{opacity: opacityAnim, transform: [{scale: scaleAnim}]}, earned && glowStyle]}>
      <TouchableOpacity
        onPress={() => onPress(badge)}
        style={[
          badgeStyles.card,
          earned
            ? {backgroundColor: badge.bg, borderColor: badge.color + '60', borderWidth: 2}
            : badgeStyles.cardLocked,
        ]}
        activeOpacity={0.75}>

        {/* Icon circle */}
        <View style={[badgeStyles.iconCircle, {backgroundColor: earned ? badge.color + '22' : '#f0f0f0'}]}>
          <Icon name={badge.icon} size={24} color={earned ? badge.color : '#d0d0d0'} />
          {!earned && (
            <View style={badgeStyles.lockBadge}>
              <Icon name="lock" size={9} color="#c0c0c0" />
            </View>
          )}
        </View>

        {/* Label */}
        <Text style={[badgeStyles.label, {color: earned ? '#1a1a2e' : '#ccc'}]} numberOfLines={2}>
          {badge.label}
        </Text>

        {/* Tier chip — only earned */}
        {earned && (
          <View style={[badgeStyles.tierChip, {backgroundColor: tier.gradient[0]}]}>
            <Text style={[badgeStyles.tierText, {color: tier.textColor}]}>{tier.label}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const badgeStyles = StyleSheet.create({
  card: {
    width: (width - 48 - 24) / 4,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 18,
    alignItems: 'center',
    gap: 6,
    minHeight: 104,
    justifyContent: 'center',
  },
  cardLocked: {
    backgroundColor: '#f9f9f9',
    borderColor: '#eee',
    borderWidth: 1.5,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  lockBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 13,
  },
  tierChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tierText: {
    fontSize: 7.5,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});

// ── Badge detail modal ─────────────────────────────────────────────────────────
const BadgeModal = ({badge, earned, visible, onClose}) => {
  if (!badge) return null;
  const tier = TIERS[badge.tier] || TIERS.bronze;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {toValue: 1, friction: 7, tension: 60, useNativeDriver: true}).start();
    }
  }, [visible]);

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <TouchableOpacity style={modalStyles.overlay} activeOpacity={1} onPress={onClose}>
        <Animated.View style={[modalStyles.card, {borderColor: badge.color, transform: [{scale: scaleAnim}]}]}>
          <View style={[modalStyles.iconWrap, {backgroundColor: earned ? badge.color + '20' : '#f5f5f5'}]}>
            <Icon name={badge.icon} size={48} color={earned ? badge.color : '#ddd'} />
            {earned && (
              <View style={[modalStyles.earnedStar, {backgroundColor: badge.color}]}>
                <Icon name="check-bold" size={10} color="#fff" />
              </View>
            )}
          </View>

          <Text style={modalStyles.title}>{badge.label}</Text>

          <View style={[modalStyles.tierBadge, {backgroundColor: tier.gradient[0]}]}>
            <Text style={[modalStyles.tierBadgeText, {color: tier.textColor}]}>{tier.label} Badge</Text>
          </View>

          <Text style={modalStyles.description}>{badge.description}</Text>

          {!earned && (
            <View style={modalStyles.lockedNote}>
              <Icon name="lock-outline" size={13} color="#ccc" />
              <Text style={modalStyles.lockedText}>Not yet earned — keep going!</Text>
            </View>
          )}

          <TouchableOpacity style={[modalStyles.closeBtn, {backgroundColor: earned ? badge.color : '#6c5ce7'}]} onPress={onClose}>
            <Text style={modalStyles.closeBtnText}>{earned ? '✨ Got it!' : 'Keep going!'}</Text>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  overlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 28},
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 28,
    borderWidth: 2,
    padding: 28,
    alignItems: 'center',
    gap: 12,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 12},
    shadowOpacity: 0.25,
    shadowRadius: 24,
  },
  iconWrap: {width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', marginBottom: 4, position: 'relative'},
  earnedStar: {position: 'absolute', bottom: 2, right: 2, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center'},
  title: {fontSize: 24, fontWeight: '900', color: '#1a1a2e', textAlign: 'center', letterSpacing: -0.5},
  tierBadge: {paddingHorizontal: 14, paddingVertical: 5, borderRadius: 12},
  tierBadgeText: {fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5},
  description: {fontSize: 14, color: '#666', lineHeight: 22, textAlign: 'center'},
  lockedNote: {flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4},
  lockedText: {fontSize: 12, color: '#bbb', fontWeight: '600'},
  closeBtn: {marginTop: 6, paddingVertical: 13, paddingHorizontal: 36, borderRadius: 25},
  closeBtnText: {color: '#fff', fontSize: 15, fontWeight: '800'},
});

// ── Main component ─────────────────────────────────────────────────────────────
const StreakBadges = ({moodHistory, userName, onPressBadge}) => {
  const stats = useMemo(() => computeStats(moodHistory), [moodHistory]);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [absenceDismissed, setAbsenceDismissed] = useState(false);
  const [showAllBadges, setShowAllBadges] = useState(false);

  const absenceSlide = useRef(new Animated.Value(-50)).current;
  const absenceOpacity = useRef(new Animated.Value(0)).current;

  const showAbsence = stats.daysAway >= 1 && !absenceDismissed;
  const absenceInfo = showAbsence ? getAbsenceMessage(stats.daysAway, userName) : null;

  useEffect(() => {
    if (showAbsence) {
      Animated.parallel([
        Animated.spring(absenceSlide, {toValue: 0, tension: 55, friction: 10, delay: 400, useNativeDriver: true}),
        Animated.timing(absenceOpacity, {toValue: 1, duration: 350, delay: 400, useNativeDriver: true}),
      ]).start();
    }
  }, [showAbsence]);

  const earnedBadges = useMemo(() => BADGES.filter(b => b.condition(stats)), [stats]);

  const previewBadges = useMemo(() => {
    const earned = BADGES.filter(b => b.condition(stats));
    const locked = BADGES.filter(b => !b.condition(stats));
    return showAllBadges ? [...earned, ...locked] : [...earned, ...locked].slice(0, 8);
  }, [stats, showAllBadges]);

  const dismissAbsence = () => {
    Animated.parallel([
      Animated.timing(absenceSlide, {toValue: -50, duration: 250, useNativeDriver: true}),
      Animated.timing(absenceOpacity, {toValue: 0, duration: 200, useNativeDriver: true}),
    ]).start(() => setAbsenceDismissed(true));
  };

  const handleBadgePress = badge => {
    setSelectedBadge(badge);
    onPressBadge?.(badge);
  };

  if (!moodHistory?.length) return null;

  // Next milestone streak
  const nextStreakTarget = [3, 7, 14, 30].find(t => t > stats.streak) || 30;

  return (
    <View style={mainStyles.container}>

      {/* Absence banner */}
      {showAbsence && absenceInfo && (
        <Animated.View
          style={[
            mainStyles.absenceBanner,
            {borderColor: absenceInfo.color, opacity: absenceOpacity, transform: [{translateY: absenceSlide}]},
          ]}>
          <View style={[mainStyles.absenceIconWrap, {backgroundColor: absenceInfo.color + '22'}]}>
            <Icon name={absenceInfo.icon} size={22} color={absenceInfo.color} />
          </View>
          <View style={mainStyles.absenceText}>
            <Text style={mainStyles.absenceTitle}>{absenceInfo.title}</Text>
            <Text style={mainStyles.absenceBody}>{absenceInfo.body}</Text>
          </View>
          <TouchableOpacity onPress={dismissAbsence} hitSlop={{top: 10, right: 10, bottom: 10, left: 10}}>
            <Icon name="close" size={16} color="#ccc" />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Section title */}
      <Text style={mainStyles.sectionTitle}>Your Progress</Text>

      {/* Stats row */}
      <View style={mainStyles.statsRow}>
        <StatCard
          icon="fire"
          value={stats.streak}
          label="day streak"
          color={stats.streak >= 3 ? '#FF6B35' : '#ccc'}
          bgColor={stats.streak >= 3 ? '#FFF3EC' : '#fafafa'}
          progress={true}
          maxProgress={nextStreakTarget}
          animDelay={0}
        />
        <StatCard
          icon="book-open-variant"
          value={stats.totalLogs}
          label="entries"
          color="#6c5ce7"
          bgColor="#F0EEFF"
          animDelay={80}
        />
        <StatCard
          icon="medal"
          value={earnedBadges.length}
          label="badges"
          color="#FFD700"
          bgColor="#FFFAE0"
          animDelay={160}
        />
        <StatCard
          icon="palette"
          value={stats.uniqueVibes}
          label="vibes"
          color="#6BCB77"
          bgColor="#E8F8EA"
          animDelay={240}
        />
      </View>

      {/* Streak progress hint */}
      {stats.streak > 0 && stats.streak < nextStreakTarget && (
        <View style={mainStyles.streakHint}>
          <Icon name="fire" size={13} color="#FF6B35" />
          <Text style={mainStyles.streakHintText}>
            {nextStreakTarget - stats.streak} more day{nextStreakTarget - stats.streak > 1 ? 's' : ''} to unlock <Text style={{fontWeight: '800'}}>
              {BADGES.find(b => b.condition({...stats, streak: nextStreakTarget}))?.label || 'next streak badge'}
            </Text>!
          </Text>
        </View>
      )}

      {/* Badges section */}
      <View style={mainStyles.badgesHeader}>
        <View>
          <Text style={mainStyles.badgesTitle}>Badges</Text>
          <Text style={mainStyles.badgesSubtitle}>{earnedBadges.length}/{BADGES.length} earned</Text>
        </View>
        <TouchableOpacity style={mainStyles.seeAllBtn} onPress={() => setShowAllBadges(v => !v)}>
          <Text style={mainStyles.seeAllText}>{showAllBadges ? 'Show less' : `See all ${BADGES.length}`}</Text>
          <Icon name={showAllBadges ? 'chevron-up' : 'chevron-down'} size={14} color="#6c5ce7" />
        </TouchableOpacity>
      </View>

      <View style={mainStyles.badgesGrid}>
        {previewBadges.map((badge, i) => (
          <BadgeCard
            key={badge.id}
            badge={badge}
            earned={badge.condition(stats)}
            onPress={handleBadgePress}
            delay={i * 35}
          />
        ))}
      </View>

      {/* Longest streak footnote */}
      {stats.longestStreak > stats.streak && (
        <Text style={mainStyles.footnote}>
          🏆 Your longest streak: <Text style={{fontWeight: '800', color: '#FF6B35'}}>{stats.longestStreak} days</Text>
        </Text>
      )}

      <BadgeModal
        badge={selectedBadge}
        earned={selectedBadge ? selectedBadge.condition(stats) : false}
        visible={!!selectedBadge}
        onClose={() => setSelectedBadge(null)}
      />
    </View>
  );
};

const mainStyles = StyleSheet.create({
  container: {width: '100%', marginBottom: 20},
  absenceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 2,
    padding: 14,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  absenceIconWrap: {width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center'},
  absenceText: {flex: 1},
  absenceTitle: {fontSize: 13, fontWeight: '800', color: '#1a1a2e', marginBottom: 2},
  absenceBody: {fontSize: 12, color: '#666', lineHeight: 17},
  sectionTitle: {fontSize: 18, fontWeight: '900', color: '#1a1a2e', marginBottom: 12, letterSpacing: -0.4},
  statsRow: {flexDirection: 'row', gap: 8, marginBottom: 10},
  streakHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF3EC',
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
  },
  streakHintText: {fontSize: 12, color: '#666', flex: 1},
  badgesHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 6,
  },
  badgesTitle: {fontSize: 16, fontWeight: '800', color: '#1a1a2e', letterSpacing: -0.3},
  badgesSubtitle: {fontSize: 11, color: '#aaa', marginTop: 1, fontWeight: '600'},
  seeAllBtn: {flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4},
  seeAllText: {fontSize: 12, color: '#6c5ce7', fontWeight: '700'},
  badgesGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  footnote: {textAlign: 'center', fontSize: 12, color: '#aaa', marginTop: 12},
});

export default StreakBadges;