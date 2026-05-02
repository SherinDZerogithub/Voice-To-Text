import React from 'react';
import {Animated, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {AvatarDisplay} from './AvatarBuilder';
import {getContrastColor} from '../utils/colors';

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
  const iconColor = getContrastColor(appBgColor);
  const styles = createStyles(appBgColor, iconColor);

  const getTimeMetadata = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12)
      return {greeting: 'Good morning', question: 'How are you starting your day?', emoji: '☀️'};
    if (hour >= 12 && hour < 17)
      return {greeting: 'Good afternoon', question: 'How has your afternoon been?', emoji: '🌤️'};
    if (hour >= 17 && hour < 21)
      return {greeting: 'Good evening', question: 'Ready to reflect on your day?', emoji: '🌆'};
    return {greeting: 'Late night', question: "What's on your mind tonight?", emoji: '🌙'};
  };

  const timeMetadata = getTimeMetadata();

  return (
    <View style={styles.card}>

      {/* ── Top bar: app label + action buttons ── */}
      <View style={styles.topBar}>
        <View style={styles.appBadge}>
          <View style={styles.appBadgeDot} />
          <Text style={styles.appBadgeText}>Scene Vibe</Text>
        </View>

        <View style={styles.topActions}>
          <TouchableOpacity style={styles.iconBtn} onPress={onOpenHistory} activeOpacity={0.7}>
            <Icon name="history" size={18} color={iconColor} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.7}>
            <Icon name="logout-variant" size={14} color={iconColor} />
            <Text style={styles.logoutText}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Divider ── */}
      <View style={styles.divider} />

      {/* ── Main content: greeting text + avatar ── */}
      <View style={styles.contentRow}>

        {/* Left: greeting */}
        <View style={styles.textBlock}>
          <Text style={styles.greetingLine}>
            {isLoginFlow ? 'Welcome back 👋' : `${timeMetadata.greeting} ${timeMetadata.emoji}`}
          </Text>
          <Text style={styles.userName} numberOfLines={1}>
            {userName || 'Explorer'}
          </Text>
          <Text style={styles.question}>{timeMetadata.question}</Text>
        </View>

        {/* Right: avatar */}
        <Animated.View
          style={[
            styles.avatarWrap,
            {
              opacity: avatarAnim,
              transform: [
                {
                  scale: avatarAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.75, 1],
                  }),
                },
                {
                  translateY: avatarAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [16, 0],
                  }),
                },
              ],
            },
          ]}>
          <AvatarDisplay config={avatarConfig} size={88} onPress={onEditAvatar} />
          <TouchableOpacity style={styles.editBadge} onPress={onEditAvatar} activeOpacity={0.8}>
            <Icon name="pencil" size={12} color="#fff" />
          </TouchableOpacity>
        </Animated.View>

      </View>
    </View>
  );
};

const createStyles = (appBgColor, contrastColor) => {
  const isDark = contrastColor === '#ffffff';
  const subtleWhite = 'rgba(255,255,255,0.12)';
  const subtleDark = 'rgba(0,0,0,0.06)';
  const border = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.07)';

  return StyleSheet.create({
    card: {
      width: '100%',
      backgroundColor: isDark ? subtleWhite : '#ffffff',
      borderRadius: 24,
      paddingHorizontal: 18,
      paddingTop: 14,
      paddingBottom: 18,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: border,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 6},
      shadowOpacity: 0.08,
      shadowRadius: 14,
    },

    // ── Top bar ──
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    appBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    appBadgeDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: '#6c5ce7',
    },
    appBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: contrastColor,
      opacity: 0.5,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    topActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    iconBtn: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.04)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: border,
    },
    logoutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      height: 34,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.04)',
      borderWidth: 1,
      borderColor: border,
    },
    logoutText: {
      fontSize: 12,
      fontWeight: '600',
      color: contrastColor,
      opacity: 0.75,
    },

    // ── Divider ──
    divider: {
      height: 1,
      backgroundColor: border,
      marginBottom: 16,
    },

    // ── Content row ──
    contentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    textBlock: {
      flex: 1,
    },
    greetingLine: {
      fontSize: 13,
      fontWeight: '500',
      color: contrastColor,
      opacity: 0.6,
      marginBottom: 2,
    },
    userName: {
      fontSize: 30,
      fontWeight: '800',
      color: contrastColor,
      letterSpacing: -0.8,
      lineHeight: 34,
      marginBottom: 5,
    },
    question: {
      fontSize: 13,
      fontWeight: '500',
      color: contrastColor,
      opacity: 0.65,
      lineHeight: 18,
    },

    // ── Avatar ──
    avatarWrap: {
      position: 'relative',
      padding: 3,
      borderRadius: 52,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(108,92,231,0.07)',
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(108,92,231,0.18)',
    },
    editBadge: {
      position: 'absolute',
      bottom: -1,
      right: -1,
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: '#6c5ce7',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: appBgColor,
      elevation: 6,
      shadowColor: '#6c5ce7',
      shadowOffset: {width: 0, height: 2},
      shadowOpacity: 0.4,
      shadowRadius: 4,
    },
  });
};

export default DashboardHero;