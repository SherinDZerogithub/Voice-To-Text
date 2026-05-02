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
    if (hour >= 5 && hour < 12) return { greeting: "Good morning", question: "How are you starting your day?", emoji: "☀️" };
    if (hour >= 12 && hour < 17) return { greeting: "Good afternoon", question: "How has your afternoon been so far?", emoji: "🌤️" };
    if (hour >= 17 && hour < 21) return { greeting: "Good evening", question: "Ready to reflect on your day?", emoji: "🌆" };
    return { greeting: "Late night check-in", question: "What's on your mind tonight?", emoji: "🌙" };
  };

  const timeMetadata = getTimeMetadata();

  return (
    <View style={styles.dashboardHero}>
      <TouchableOpacity style={styles.heroHistoryBtn} onPress={onOpenHistory}>
        <Icon name="history" size={24} color={iconColor} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.heroLogoutBtn} onPress={onLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <View style={styles.heroContent}>
        <View style={styles.heroTextContainer}>
          <Text style={styles.heroTitle}>Scene Vibe</Text>
          <Text style={styles.heroGreeting}>
            {isLoginFlow ? 'Welcome back 👋' : `${timeMetadata.greeting} ${timeMetadata.emoji}`}
          </Text>
          <Text style={styles.heroUserName}>{userName || 'Explorer'}</Text>
          <Text style={styles.heroQuestion}>{timeMetadata.question}</Text>
        </View>

        <Animated.View
          style={[
            styles.heroAvatarContainer,
            {
              opacity: avatarAnim,
              transform: [
                {
                  scale: avatarAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
                {
                  translateY: avatarAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}>
          <AvatarDisplay config={avatarConfig} size={100} onPress={onEditAvatar} />
          <TouchableOpacity style={styles.editAvatarBadge} onPress={onEditAvatar}>
            <Icon name="pencil" size={16} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
};

const createStyles = (appBgColor, contrastColor) => {
  const isDarkBg = contrastColor === '#ffffff';

  return StyleSheet.create({
    dashboardHero: {
      width: '100%',
      backgroundColor: isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.03)',
      borderRadius: 24,
      padding: 20,
      marginBottom: 25,
      borderWidth: 1,
      borderColor: isDarkBg ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)',
      position: 'relative',
      overflow: 'hidden',
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 10},
      shadowOpacity: 0.1,
      shadowRadius: 15,
    },
    heroContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    heroTextContainer: {
      flex: 1,
      paddingRight: 15,
    },
    heroTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: contrastColor,
      opacity: 0.6,
      textTransform: 'uppercase',
      letterSpacing: 2,
      marginBottom: 8,
    },
    heroGreeting: {
      fontSize: 20,
      fontWeight: '400',
      color: contrastColor,
    },
    heroUserName: {
      fontSize: 36,
      fontWeight: '800',
      color: contrastColor,
      letterSpacing: -1,
      lineHeight: 40,
      marginBottom: 4,
    },
    heroQuestion: {
      fontSize: 15,
      fontWeight: '600',
      color: contrastColor,
      opacity: 0.8,
    },
    heroAvatarContainer: {
      position: 'relative',
      padding: 4,
      borderRadius: 60,
      backgroundColor: isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.02)',
      borderWidth: 1,
      borderColor: isDarkBg ? 'rgba(255,255,255,0.3)' : 'rgba(108, 92, 231, 0.2)',
    },
    editAvatarBadge: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      backgroundColor: '#6c5ce7',
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: appBgColor,
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 4},
      shadowOpacity: 0.3,
      shadowRadius: 5,
    },
    heroHistoryBtn: {
      position: 'absolute',
      top: 15,
      left: 15,
      padding: 8,
      opacity: 0.6,
      zIndex: 1,
    },
    heroLogoutBtn: {
      position: 'absolute',
      top: 15,
      right: 15,
      paddingVertical: 6,
      paddingHorizontal: 12,
      backgroundColor: 'rgba(255, 255, 255, 0.2)', // Slightly opaque white background
      borderRadius: 15, // Rounded corners
      opacity: 0.8,
      zIndex: 1,
    },
    logoutText: {
      fontSize: 13,
      fontWeight: '700',
      color: contrastColor,
    },
  });
};

export default DashboardHero;
