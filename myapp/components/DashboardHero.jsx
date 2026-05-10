import React from 'react';
import {Animated, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {AvatarDisplay} from './AvatarBuilder';
import {getContrastColor} from '../utils/colors';

const ACCENT = '#7c6ff7';

const DashboardHero = ({
  appBgColor,
  avatarAnim,
  avatarConfig,
  isLoginFlow,
  onEditAvatar,
  onLogout,
  onOpenHistory,
  userName,
}) => {
  const isDark = getContrastColor(appBgColor) === '#ffffff';

  const getTimeMetadata = () => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return {greeting: 'Good morning', emoji: '☀️', sub: 'Ready to start your day?'};
    if (h >= 12 && h < 17) return {greeting: 'Good afternoon', emoji: '🌤️', sub: 'How has your day been?'};
    if (h >= 17 && h < 21) return {greeting: 'Good evening', emoji: '🌆', sub: 'Time to reflect on your day'};
    return {greeting: 'Late night', emoji: '🌙', sub: "What's on your mind tonight?"};
  };

  const {greeting, emoji, sub} = getTimeMetadata();
  const textColor = isDark ? '#fff' : '#1a1a2e';
  const mutedColor = isDark ? 'rgba(255,255,255,0.55)' : '#6b7280';
  const cardBg = isDark ? 'rgba(255,255,255,0.08)' : '#fff';
  const borderColor = isDark ? 'rgba(255,255,255,0.12)' : '#ede9fe';
  const btnBg = isDark ? 'rgba(255,255,255,0.1)' : '#f5f3ff';
  const btnBorder = isDark ? 'rgba(255,255,255,0.15)' : '#ede9fe';

  return (
    <View style={[styles.card, {backgroundColor: cardBg, borderColor}]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <View style={styles.brandDot} />
          <Text style={[styles.brandText, {color: mutedColor}]}>MOODVOICE</Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionBtn, {backgroundColor: btnBg, borderColor: btnBorder}]} onPress={onOpenHistory} activeOpacity={0.7}>
            <Icon name="book-heart-outline" size={16} color={isDark ? 'rgba(255,255,255,0.7)' : ACCENT} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.logoutBtn, {backgroundColor: btnBg, borderColor: btnBorder}]} onPress={onLogout} activeOpacity={0.7}>
            <Icon name="logout-variant" size={14} color={isDark ? 'rgba(255,255,255,0.6)' : '#6b7280'} />
            <Text style={[styles.logoutText, {color: isDark ? 'rgba(255,255,255,0.6)' : '#6b7280'}]}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Divider */}
      <View style={[styles.divider, {backgroundColor: borderColor}]} />

      {/* Main content */}
      <View style={styles.contentRow}>
        <View style={styles.textBlock}>
          <View style={styles.greetingRow}>
            <Text style={styles.greetingEmoji}>{isLoginFlow ? '👋' : emoji}</Text>
            <Text style={[styles.greetingText, {color: mutedColor}]}>
              {isLoginFlow ? 'Welcome back' : greeting}
            </Text>
          </View>
          <Text style={[styles.userName, {color: textColor}]} numberOfLines={1}>
            {userName || 'Explorer'}
          </Text>
          <Text style={[styles.subText, {color: mutedColor}]}>{sub}</Text>

          {/* Quick stats row */}
          <View style={styles.quickStats}>
            <View style={[styles.quickStatPill, {backgroundColor: ACCENT + '15', borderColor: ACCENT + '25'}]}>
              <Icon name="microphone-outline" size={11} color={ACCENT} />
              <Text style={[styles.quickStatText, {color: ACCENT}]}>Voice Log</Text>
            </View>
            <View style={[styles.quickStatPill, {backgroundColor: '#10b98115', borderColor: '#10b98125'}]}>
              <Icon name="emoticon-happy-outline" size={11} color="#10b981" />
              <Text style={[styles.quickStatText, {color: '#10b981'}]}>Mood Track</Text>
            </View>
          </View>
        </View>

        {/* Avatar */}
        <Animated.View
          style={[
            styles.avatarWrap,
            {
              borderColor: isDark ? 'rgba(255,255,255,0.2)' : ACCENT + '30',
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : ACCENT + '08',
            },
            {
              opacity: avatarAnim,
              transform: [
                {scale: avatarAnim.interpolate({inputRange: [0, 1], outputRange: [0.7, 1]})},
                {translateY: avatarAnim.interpolate({inputRange: [0, 1], outputRange: [20, 0]})},
              ],
            },
          ]}>
          <AvatarDisplay config={avatarConfig} size={86} onPress={onEditAvatar} />
          <TouchableOpacity style={[styles.editBadge, {borderColor: appBgColor}]} onPress={onEditAvatar} activeOpacity={0.8}>
            <Icon name="pencil" size={11} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 18,
    borderWidth: 1,
    elevation: 4,
    shadowColor: ACCENT,
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  brandRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
  brandDot: {width: 7, height: 7, borderRadius: 4, backgroundColor: ACCENT},
  brandText: {fontSize: 11, fontWeight: '800', letterSpacing: 1.5},
  actions: {flexDirection: 'row', alignItems: 'center', gap: 8},
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    width: 'auto',
    paddingHorizontal: 12,
    gap: 5,
  },
  logoutText: {fontSize: 12, fontWeight: '600'},
  divider: {height: 1, marginBottom: 16},
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  textBlock: {flex: 1},
  greetingRow: {flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3},
  greetingEmoji: {fontSize: 14},
  greetingText: {fontSize: 12, fontWeight: '600'},
  userName: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.8,
    lineHeight: 32,
    marginBottom: 4,
  },
  subText: {fontSize: 12, fontWeight: '500', lineHeight: 17, marginBottom: 12},
  quickStats: {flexDirection: 'row', gap: 8},
  quickStatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  quickStatText: {fontSize: 11, fontWeight: '700'},
  avatarWrap: {
    position: 'relative',
    padding: 4,
    borderRadius: 52,
    borderWidth: 1.5,
  },
  editBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    elevation: 4,
    shadowColor: ACCENT,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
});

export default DashboardHero;
