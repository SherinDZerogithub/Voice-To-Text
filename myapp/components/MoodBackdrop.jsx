import React, {useEffect, useRef} from 'react';
import {Animated, StyleSheet, View} from 'react-native';
import {getContrastColor} from '../utils/colors';

const withAlpha = (hex, alpha) => {
  const normalized = typeof hex === 'string' ? hex.replace('#', '') : '';
  return normalized.length === 6 ? `#${normalized}${alpha}` : `#7c6ff7${alpha}`;
};

const MoodBackdrop = ({backgroundColor = '#f8fafc', moodColor = '#7c6ff7'}) => {
  const driftOne = useRef(new Animated.Value(0)).current;
  const driftTwo = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const isDark = getContrastColor(backgroundColor) === '#ffffff';

  useEffect(() => {
    const firstLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(driftOne, {toValue: 1, duration: 8500, useNativeDriver: true}),
        Animated.timing(driftOne, {toValue: 0, duration: 8500, useNativeDriver: true}),
      ]),
    );
    const secondLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(driftTwo, {toValue: 1, duration: 11000, useNativeDriver: true}),
        Animated.timing(driftTwo, {toValue: 0, duration: 11000, useNativeDriver: true}),
      ]),
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {toValue: 1, duration: 4000, useNativeDriver: true}),
        Animated.timing(pulse, {toValue: 0, duration: 4000, useNativeDriver: true}),
      ]),
    );

    firstLoop.start();
    secondLoop.start();
    pulseLoop.start();

    return () => {
      firstLoop.stop();
      secondLoop.stop();
      pulseLoop.stop();
    };
  }, [driftOne, driftTwo, pulse]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.base, {backgroundColor}]} />
      <Animated.View
        style={[
          styles.orb,
          styles.orbOne,
          {backgroundColor: withAlpha(moodColor, '20')},
          {
            opacity: pulse.interpolate({inputRange: [0, 1], outputRange: [0.7, 1]}),
            transform: [
              {translateX: driftOne.interpolate({inputRange: [0, 1], outputRange: [0, 26]})},
              {translateY: driftOne.interpolate({inputRange: [0, 1], outputRange: [0, 42]})},
              {scale: pulse.interpolate({inputRange: [0, 1], outputRange: [1, 1.08]})},
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          styles.orbTwo,
          {backgroundColor: withAlpha(isDark ? '#ffffff' : '#f093fb', '18')},
          {
            opacity: driftTwo.interpolate({inputRange: [0, 1], outputRange: [0.55, 0.9]}),
            transform: [
              {translateX: driftTwo.interpolate({inputRange: [0, 1], outputRange: [0, -30]})},
              {translateY: driftTwo.interpolate({inputRange: [0, 1], outputRange: [0, -34]})},
            ],
          },
        ]}
      />
      <View style={[styles.ring, {borderColor: withAlpha(moodColor, '14')}]} />
      <View style={[styles.ringSmall, {borderColor: withAlpha(moodColor, '10')}]} />
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    ...StyleSheet.absoluteFillObject,
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orbOne: {
    width: 240,
    height: 240,
    top: -92,
    right: -86,
  },
  orbTwo: {
    width: 190,
    height: 190,
    top: 210,
    left: -105,
  },
  ring: {
    position: 'absolute',
    width: 310,
    height: 310,
    borderRadius: 155,
    top: 70,
    right: -190,
    borderWidth: 1,
  },
  ringSmall: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    top: 110,
    right: -150,
    borderWidth: 1,
  },
});

export default MoodBackdrop;
