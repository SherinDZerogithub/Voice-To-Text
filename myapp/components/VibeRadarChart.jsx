import React, {useEffect, useRef, useMemo} from 'react';
import {View, Animated, StyleSheet} from 'react-native';
import Svg, {
  G,
  Line,
  Text as SvgText,
  Polygon,
  Circle,
  Defs,
  LinearGradient,
  Stop,
  Path,
} from 'react-native-svg';

const VibeRadarChart = ({vibeScores, size = 280, color = '#6c5ce7'}) => {
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    scaleAnim.setValue(0.3);
    opacityAnim.setValue(0);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 28,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();
  }, [vibeScores]);

  const data = useMemo(() => {
    if (!vibeScores || typeof vibeScores !== 'object') return [];
    return Object.entries(vibeScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, score]) => ({
        label: label.charAt(0).toUpperCase() + label.slice(1),
        pct: Math.round(score * 100),
        value: Math.min(1, Math.max(0.08, score)),
      }));
  }, [vibeScores]);

  const numAxes = data.length;
  if (numAxes < 3) return null;

  const cx = size / 2;
  const cy = size / 2;
  const maxR = (size / 2) * 0.58;
  const labelR = maxR + 28;

  const getCoords = (index, r) => {
    const angle = (Math.PI * 2 * index) / numAxes - Math.PI / 2;
    return {x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle)};
  };

  const dataPoints = data
    .map((item, i) => {
      const {x, y} = getCoords(i, item.value * maxR);
      return `${x},${y}`;
    })
    .join(' ');

  const rings = [0.25, 0.5, 0.75, 1];

  return (
    <View style={[styles.container, {width: size, height: size + 10}]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="radarFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity="0.45" />
            <Stop offset="100%" stopColor={color} stopOpacity="0.1" />
          </LinearGradient>
        </Defs>
        <G>
          {rings.map((p, i) => (
            <Polygon
              key={`ring-${i}`}
              points={Array.from({length: numAxes})
                .map((_, j) => {
                  const {x, y} = getCoords(j, maxR * p);
                  return `${x},${y}`;
                })
                .join(' ')}
              fill="none"
              stroke={i === rings.length - 1 ? '#d0cde8' : '#ece9f8'}
              strokeWidth={i === rings.length - 1 ? 1.5 : 1}
              strokeDasharray={i === rings.length - 1 ? '' : '3 3'}
            />
          ))}
          {/* Ring % labels on the vertical axis */}
          {rings.map((p, i) => {
            const {y} = getCoords(0, maxR * p);
            return (
              <SvgText
                key={`rlabel-${i}`}
                x={cx + 4}
                y={y - 3}
                fontSize="8"
                fill="#bbb"
                fontWeight="600">
                {Math.round(p * 100)}%
              </SvgText>
            );
          })}
          {data.map((_, i) => {
            const {x, y} = getCoords(i, maxR);
            return (
              <Line
                key={`spoke-${i}`}
                x1={cx}
                y1={cy}
                x2={x}
                y2={y}
                stroke="#e0ddf5"
                strokeWidth="1"
              />
            );
          })}
        </G>
        {/* Labels */}
        {data.map((item, i) => {
          const {x, y} = getCoords(i, labelR);
          const anchor =
            x < cx - 4 ? 'end' : x > cx + 4 ? 'start' : 'middle';
          return (
            <G key={`lbl-${i}`}>
              <SvgText
                x={x}
                y={y - 5}
                fontSize="10"
                fontWeight="700"
                fill="#3d3d5c"
                textAnchor={anchor}
                alignmentBaseline="middle">
                {item.label}
              </SvgText>
              <SvgText
                x={x}
                y={y + 8}
                fontSize="9"
                fontWeight="600"
                fill={color}
                textAnchor={anchor}
                alignmentBaseline="middle">
                {item.pct}%
              </SvgText>
            </G>
          );
        })}
      </Svg>

      {/* Animated data polygon */}
      <Animated.View
        style={{
          ...StyleSheet.absoluteFillObject,
          opacity: opacityAnim,
          transform: [{scale: scaleAnim}],
        }}>
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id="radarFill2" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={color} stopOpacity="0.4" />
              <Stop offset="100%" stopColor={color} stopOpacity="0.08" />
            </LinearGradient>
          </Defs>
          <Polygon
            points={dataPoints}
            fill="url(#radarFill2)"
            stroke={color}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {data.map((item, i) => {
            const {x, y} = getCoords(i, item.value * maxR);
            return (
              <Circle
                key={`dot-${i}`}
                cx={x}
                cy={y}
                r="5"
                fill="#fff"
                stroke={color}
                strokeWidth="2.5"
              />
            );
          })}
        </Svg>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    alignSelf: 'center',
  },
});

export default VibeRadarChart;
