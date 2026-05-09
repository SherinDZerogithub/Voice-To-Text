import React, { useEffect, useRef, useMemo } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';
import Svg, { G, Line, Text as SvgText, Polygon, Circle } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * An animated Radar (Spider) Chart for visualizing vibe scores.
 * @param {Object} props.vibeScores - Object containing { vibeName: score (0-1) }
 * @param {number} props.size - Size of the chart canvas
 * @param {string} props.color - Theme color for the data area
 */
const VibeRadarChart = ({ vibeScores, size = SCREEN_WIDTH * 0.9, color = '#6c5ce7' }) => {
    const scaleAnim = useRef(new Animated.Value(0.4)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Reset and trigger entrance animation whenever vibeScores changes
        scaleAnim.setValue(0.4);
        opacityAnim.setValue(0);

        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 6,
                tension: 30,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            })
        ]).start();
    }, [vibeScores, scaleAnim, opacityAnim]);

    // Data Processing: Sort by intensity and take top 8 vibes
    const data = useMemo(() => {
        if (!vibeScores || typeof vibeScores !== 'object') return [];
        return Object.entries(vibeScores)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([label, score]) => ({
                label: `${label.charAt(0).toUpperCase() + label.slice(1)} ${Math.round(score * 100)}%`,
                value: Math.min(1, Math.max(0.1, score)) // Clamp between 0.1 and 1
            }));
    }, [vibeScores]);

    const numAxes = data.length;
    if (numAxes < 3) return null; // A radar requires at least 3 points

    const centerX = size / 2;
    const centerY = size / 2;
    const maxRadius = (size / 2) * 0.65; // Leave margin for labels

    // Helper to calculate vertex coordinates
    const getCoords = (index, r) => {
        const angle = (Math.PI * 2 * index) / numAxes - Math.PI / 2;
        return {
            x: centerX + r * Math.cos(angle),
            y: centerY + r * Math.sin(angle)
        };
    };

    const dataPoints = data.map((item, i) => {
        const { x, y } = getCoords(i, item.value * maxRadius);
        return `${x},${y}`;
    }).join(' ');

    return (
        <View style={[styles.container, { width: size, height: size }]}>
            {/* Background Grid and Axis Layer */}
            <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
                <G>
                    {/* Concentric grid rings */}
                    {[0.25, 0.5, 0.75, 1].map((p, i) => (
                        <Polygon
                            key={`grid-${i}`}
                            points={Array.from({ length: numAxes }).map((_, j) => {
                                const { x, y } = getCoords(j, maxRadius * p);
                                return `${x},${y}`;
                            }).join(' ')}
                            fill="none"
                            stroke="#E0E0E0"
                            strokeWidth="1"
                            strokeDasharray={i === 3 ? "" : "4 2"}
                        />
                    ))}
                    {/* Axis spokes */}
                    {data.map((_, i) => {
                        const { x, y } = getCoords(i, maxRadius);
                        return (
                            <Line key={`axis-${i}`} x1={centerX} y1={centerY} x2={x} y2={y} stroke="#E0E0E0" strokeWidth="1" />
                        );
                    })}
                </G>

                {/* Axis Labels (Kept outside animation for sharpness) */}
                {data.map((item, i) => {
                    const { x, y } = getCoords(i, maxRadius + 22);
                    return (
                        <SvgText
                            key={`label-${i}`}
                            x={x}
                            y={y}
                            fontSize="11"
                            fontWeight="bold"
                            fill="#444"
                            textAnchor="middle"
                            alignmentBaseline="middle"
                        >
                            {item.label}
                        </SvgText>
                    );
                })}
            </Svg>

            {/* Animated Data Layer */}
            <Animated.View style={{
                ...StyleSheet.absoluteFillObject,
                opacity: opacityAnim,
                transform: [{ scale: scaleAnim }]
            }}>
                <Svg width={size} height={size}>
                    <Polygon
                        points={dataPoints}
                        fill={color}
                        fillOpacity="0.3"
                        stroke={color}
                        strokeWidth="3"
                    />
                    {data.map((item, i) => {
                        const { x, y } = getCoords(i, item.value * maxRadius);
                        return <Circle key={`dot-${i}`} cx={x} cy={y} r="4.5" fill={color} />;
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
        marginVertical: 10,
    },
});

export default VibeRadarChart;