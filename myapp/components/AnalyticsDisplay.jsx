import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Animated,
  ActivityIndicator,
  TouchableOpacity,
  PanResponder,
} from 'react-native';
import Svg, {
  G,
  Path,
  Circle,
  Line,
  Rect,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
  Polygon,
} from 'react-native-svg';
import { getContrastColor } from '../utils/colors';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 48;
const CHART_HEIGHT = 180;
const DONUT_SIZE = 200;
const DONUT_RADIUS = 70;
const DONUT_STROKE = 28;

// ─── Utility ──────────────────────────────────────────────────────────────────

const polarToCartesian = (cx, cy, r, angleDeg) => {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

const describeArc = (cx, cy, r, startAngle, endAngle) => {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const large = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y}`;
};

// ─── Animated Number ──────────────────────────────────────────────────────────

const AnimatedNumber = ({ value, duration = 800, style, suffix = '' }) => {
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, { toValue: value, duration, useNativeDriver: false }).start();
    const id = anim.addListener(({ value: v }) => {
      if (isMounted.current) setDisplay(Math.round(v));
    });
    return () => anim.removeListener(id);
  }, [value]);

  return <Text style={style}>{display}{suffix}</Text>;
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

const StatCard = ({ title, value, icon, color, suffix = '', delay = 0 }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 450, delay, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 55, friction: 8, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0;

  return (
    <Animated.View style={[styles.statCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={[styles.statIconWrap, { backgroundColor: color + '1A' }]}>
        <Icon name={icon} size={22} color={color} />
      </View>
      <Text style={styles.statTitle}>{title}</Text>
      <AnimatedNumber
        value={numericValue}
        suffix={suffix}
        style={[styles.statValue, { color }]}
      />
    </Animated.View>
  );
};

// ─── Donut Chart ──────────────────────────────────────────────────────────────

const DonutChart = ({ data, total }) => {
  const animProgress = useRef(new Animated.Value(0)).current;
  const [progress, setProgress] = useState(0);
  const [activeIndex, setActiveIndex] = useState(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    animProgress.setValue(0);
    Animated.timing(animProgress, { toValue: 1, duration: 1200, useNativeDriver: false }).start();
    const id = animProgress.addListener(({ value }) => {
      if (isMounted.current) setProgress(value);
    });
    return () => animProgress.removeListener(id);
  }, [data]);

  const cx = DONUT_SIZE / 2;
  const cy = DONUT_SIZE / 2;

  const slices = useMemo(() => {
    let cumAngle = 0;
    return data.map((item, i) => {
      const pct = total > 0 ? item.count / total : 0;
      const angle = pct * 360;
      const start = cumAngle;
      cumAngle += angle;
      return { ...item, startAngle: start, endAngle: cumAngle, pct };
    });
  }, [data, total]);

  const centerLabel = activeIndex !== null ? slices[activeIndex] : null;

  return (
    <View style={styles.donutContainer}>
      <Svg width={DONUT_SIZE} height={DONUT_SIZE}>
        {/* Background ring */}
        <Circle cx={cx} cy={cy} r={DONUT_RADIUS} fill="none" stroke="#F0F0F5" strokeWidth={DONUT_STROKE} />
        {slices.map((slice, i) => {
          const drawnEnd = slice.startAngle + (slice.endAngle - slice.startAngle) * progress;
          if (drawnEnd <= slice.startAngle) return null;
          const isActive = activeIndex === i;
          return (
            <Path
              key={i}
              d={describeArc(cx, cy, DONUT_RADIUS, slice.startAngle, Math.min(drawnEnd, slice.endAngle))}
              fill="none"
              stroke={slice.color || '#6c5ce7'}
              strokeWidth={isActive ? DONUT_STROKE + 6 : DONUT_STROKE}
              strokeLinecap="round"
              onPress={() => setActiveIndex(activeIndex === i ? null : i)}
            />
          );
        })}
        {/* Center text */}
        <SvgText x={cx} y={cy - 10} textAnchor="middle" fontSize="28" fontWeight="bold" fill="#2d3436">
          {centerLabel ? Math.round(centerLabel.pct * 100) + '%' : total}
        </SvgText>
        <SvgText x={cx} y={cy + 14} textAnchor="middle" fontSize="11" fontWeight="600" fill="#888">
          {centerLabel ? centerLabel.label : 'ENTRIES'}
        </SvgText>
      </Svg>

      {/* Legend */}
      <View style={styles.legendContainer}>
        {slices.map((slice, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.legendItem, activeIndex === i && styles.legendItemActive]}
            onPress={() => setActiveIndex(activeIndex === i ? null : i)}
            activeOpacity={0.7}
          >
            <View style={[styles.legendDot, { backgroundColor: slice.color || '#6c5ce7' }]} />
            <Text style={styles.legendLabel} numberOfLines={1}>
              {slice.label}
            </Text>
            <Text style={[styles.legendCount, { color: slice.color || '#6c5ce7' }]}>
              {slice.count}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// ─── Line Chart (Daily Trend) ─────────────────────────────────────────────────

const LineChart = ({ dailyData }) => {
  const animProgress = useRef(new Animated.Value(0)).current;
  const [progress, setProgress] = useState(0);
  const [tooltip, setTooltip] = useState(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    animProgress.setValue(0);
    Animated.timing(animProgress, { toValue: 1, duration: 1400, useNativeDriver: false }).start();
    const id = animProgress.addListener(({ value }) => {
      if (isMounted.current) setProgress(value);
    });
    return () => animProgress.removeListener(id);
  }, [dailyData]);

  if (!dailyData || dailyData.length < 2) {
    return (
      <View style={styles.chartEmpty}>
        <Icon name="chart-line" size={32} color="#ddd" />
        <Text style={styles.chartEmptyText}>Need more data for trends</Text>
      </View>
    );
  }

  const PAD_L = 36;
  const PAD_R = 16;
  const PAD_T = 16;
  const PAD_B = 30;
  const W = CHART_WIDTH - PAD_L - PAD_R;
  const H = CHART_HEIGHT - PAD_T - PAD_B;

  const maxVal = Math.max(...dailyData.map(d => d.total_entries), 1);
  const minVal = 0;

  const toX = (i) => PAD_L + (i / (dailyData.length - 1)) * W;
  const toY = (v) => PAD_T + H - ((v - minVal) / (maxVal - minVal)) * H;

  // Smooth curve using cardinal spline
  const buildPath = () => {
    const pts = dailyData.map((d, i) => ({ x: toX(i), y: toY(d.total_entries) }));
    if (pts.length < 2) return '';

    const totalPoints = Math.floor(pts.length * progress);
    const visiblePts = pts.slice(0, Math.max(2, totalPoints));

    let d = `M ${visiblePts[0].x} ${visiblePts[0].y}`;
    for (let i = 1; i < visiblePts.length; i++) {
      const p0 = visiblePts[i - 1];
      const p1 = visiblePts[i];
      const cpx = (p0.x + p1.x) / 2;
      d += ` C ${cpx} ${p0.y}, ${cpx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  const buildAreaPath = () => {
    const pts = dailyData.map((d, i) => ({ x: toX(i), y: toY(d.total_entries) }));
    const totalPoints = Math.floor(pts.length * progress);
    const visiblePts = pts.slice(0, Math.max(2, totalPoints));
    if (visiblePts.length < 2) return '';

    let d = `M ${visiblePts[0].x} ${PAD_T + H}`;
    d += ` L ${visiblePts[0].x} ${visiblePts[0].y}`;
    for (let i = 1; i < visiblePts.length; i++) {
      const p0 = visiblePts[i - 1];
      const p1 = visiblePts[i];
      const cpx = (p0.x + p1.x) / 2;
      d += ` C ${cpx} ${p0.y}, ${cpx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    d += ` L ${visiblePts[visiblePts.length - 1].x} ${PAD_T + H} Z`;
    return d;
  };

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(p => ({
    y: PAD_T + H * (1 - p),
    label: Math.round(maxVal * p),
  }));

  const xLabels = dailyData.filter((_, i) => {
    const step = Math.ceil(dailyData.length / 5);
    return i % step === 0 || i === dailyData.length - 1;
  });

  const linePath = buildPath();
  const areaPath = buildAreaPath();

  return (
    <View>
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
        <Defs>
          <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#6c5ce7" stopOpacity="0.25" />
            <Stop offset="100%" stopColor="#6c5ce7" stopOpacity="0.02" />
          </LinearGradient>
        </Defs>

        {/* Grid lines */}
        {gridLines.map((g, i) => (
          <G key={i}>
            <Line x1={PAD_L} y1={g.y} x2={PAD_L + W} y2={g.y} stroke="#F0EFF8" strokeWidth="1" strokeDasharray="4 3" />
            <SvgText x={PAD_L - 6} y={g.y + 4} textAnchor="end" fontSize="9" fill="#BBB" fontWeight="600">
              {g.label}
            </SvgText>
          </G>
        ))}

        {/* Area fill */}
        {areaPath ? <Path d={areaPath} fill="url(#areaGrad)" /> : null}

        {/* Line */}
        {linePath ? (
          <Path d={linePath} fill="none" stroke="#6c5ce7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        ) : null}

        {/* Data dots */}
        {dailyData.map((d, i) => {
          if (i > Math.floor(dailyData.length * progress)) return null;
          return (
            <Circle
              key={i}
              cx={toX(i)}
              cy={toY(d.total_entries)}
              r={tooltip?.index === i ? 6 : 3.5}
              fill={tooltip?.index === i ? '#6c5ce7' : '#fff'}
              stroke="#6c5ce7"
              strokeWidth="2"
              onPress={() => setTooltip(tooltip?.index === i ? null : { index: i, ...d })}
            />
          );
        })}

        {/* Tooltip */}
        {tooltip && (() => {
          const tx = toX(tooltip.index);
          const ty = toY(tooltip.total_entries);
          const boxW = 70;
          const boxH = 38;
          const bx = Math.min(tx - boxW / 2, CHART_WIDTH - boxW - 4);
          const by = ty - boxH - 10;
          return (
            <G>
              <Rect x={bx} y={by} width={boxW} height={boxH} rx="8" fill="#2d3436" opacity="0.92" />
              <SvgText x={bx + boxW / 2} y={by + 14} textAnchor="middle" fontSize="11" fill="#fff" fontWeight="bold">
                {tooltip.date?.slice(5)}
              </SvgText>
              <SvgText x={bx + boxW / 2} y={by + 28} textAnchor="middle" fontSize="10" fill="#a29bfe">
                {tooltip.total_entries} {tooltip.total_entries === 1 ? 'entry' : 'entries'}
              </SvgText>
            </G>
          );
        })()}

        {/* X-axis labels */}
        {xLabels.map((d, i) => {
          const idx = dailyData.indexOf(d);
          return (
            <SvgText key={i} x={toX(idx)} y={PAD_T + H + 18} textAnchor="middle" fontSize="9" fill="#AAA" fontWeight="600">
              {d.date?.slice(5)}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
};

// ─── Bar Chart (Mood Frequency) ───────────────────────────────────────────────

const BarChart = ({ data, total }) => {
  const BAR_H = 36;
  const GAP = 10;
  const PAD_L = 80;
  const PAD_R = 50;
  const W = CHART_WIDTH - PAD_L - PAD_R;

  // Keep animated values in a ref; rebuild when data length changes
  const animWidthsRef = useRef([]);
  if (animWidthsRef.current.length !== data.length) {
    animWidthsRef.current = data.map(() => new Animated.Value(0));
  }
  const animWidths = animWidthsRef.current;

  useEffect(() => {
    const animations = animWidths.map((anim, i) => {
      anim.setValue(0);
      const pct = total > 0 ? data[i].count / total : 0;
      return Animated.spring(anim, {
        toValue: pct * W,
        tension: 40,
        friction: 8,
        delay: i * 80,
        useNativeDriver: false,
      });
    });
    const composite = Animated.parallel(animations);
    composite.start();
    return () => composite.stop();
  }, [data, total]);

  const chartH = data.length * (BAR_H + GAP);

  return (
    <View style={{ height: chartH }}>
      {data.map((item, i) => {
        const pct = total > 0 ? (item.count / total) * 100 : 0;
        return (
          <View key={i} style={[styles.barRow, { height: BAR_H, marginBottom: GAP }]}>
            <Text style={styles.barLabel} numberOfLines={1}>{item.label}</Text>
            <View style={styles.barTrack}>
              <Animated.View
                style={[
                  styles.barFill,
                  {
                    backgroundColor: item.color || '#6c5ce7',
                    width: animWidths[i] || 0,
                    borderRadius: 6,
                  },
                ]}
              />
            </View>
            <Text style={[styles.barPct, { color: item.color || '#6c5ce7' }]}>
              {Math.round(pct)}%
            </Text>
          </View>
        );
      })}
    </View>
  );
};

// ─── Heatmap Calendar ─────────────────────────────────────────────────────────

const MoodHeatmap = ({ dailyData }) => {
  if (!dailyData || dailyData.length === 0) return null;

  const last28 = useMemo(() => {
    const result = [];
    const today = new Date();
    for (let i = 27; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const found = dailyData.find(x => x.date === key);
      result.push({ date: key, count: found?.total_entries || 0, day: d.getDay() });
    }
    return result;
  }, [dailyData]);

  const maxCount = Math.max(...last28.map(d => d.count), 1);

  const CELL = 28;
  const GAP = 4;
  const COLS = 7;
  const ROWS = 4;

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const getColor = (count) => {
    if (count === 0) return '#F0EFF8';
    const intensity = count / maxCount;
    if (intensity < 0.25) return '#c7c2f8';
    if (intensity < 0.5) return '#a29bfe';
    if (intensity < 0.75) return '#7c75f5';
    return '#6c5ce7';
  };

  const weeks = [];
  for (let col = 0; col < COLS; col++) {
    weeks.push(last28.slice(col * ROWS, col * ROWS + ROWS));
  }

  return (
    <View style={styles.heatmapContainer}>
      <View style={styles.heatmapDayLabels}>
        {dayLabels.map((l, i) => (
          <Text key={i} style={styles.heatmapDayLabel}>{l}</Text>
        ))}
      </View>
      <View style={styles.heatmapGrid}>
        {last28.map((day, i) => (
          <View
            key={i}
            style={[
              styles.heatmapCell,
              { backgroundColor: getColor(day.count), width: CELL, height: CELL, borderRadius: 7, margin: GAP / 2 },
            ]}
          >
            {day.count > 0 && (
              <Text style={styles.heatmapCellText}>{day.count}</Text>
            )}
          </View>
        ))}
      </View>
      <View style={styles.heatmapLegend}>
        <Text style={styles.heatmapLegendLabel}>Less</Text>
        {['#F0EFF8', '#c7c2f8', '#a29bfe', '#7c75f5', '#6c5ce7'].map((c, i) => (
          <View key={i} style={[styles.heatmapLegendCell, { backgroundColor: c }]} />
        ))}
        <Text style={styles.heatmapLegendLabel}>More</Text>
      </View>
    </View>
  );
};

// ─── Section Card ─────────────────────────────────────────────────────────────

const SectionCard = ({ title, icon, iconColor = '#6c5ce7', children, accentColor }) => (
  <View style={[styles.sectionCard, accentColor ? { borderTopColor: accentColor, borderTopWidth: 3 } : {}]}>
    <View style={styles.sectionCardHeader}>
      <View style={[styles.sectionIconWrap, { backgroundColor: (iconColor || '#6c5ce7') + '18' }]}>
        <Icon name={icon} size={18} color={iconColor} />
      </View>
      <Text style={styles.sectionCardTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const AnalyticsDisplay = ({ analyticsData, appBgColor, isLoading, onRefresh }) => {
  const contrastColor = getContrastColor(appBgColor);
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (analyticsData) {
      Animated.spring(headerAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }).start();
    }
  }, [analyticsData]);

  if (isLoading && !analyticsData) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6c5ce7" />
        <Text style={[styles.loadingText, { color: contrastColor }]}>Crunching your mood data…</Text>
      </View>
    );
  }

  if (!analyticsData) {
    return (
      <View style={styles.centerContainer}>
        <Icon name="chart-donut-variant" size={64} color="#d0cde8" />
        <Text style={[styles.emptyText, { color: contrastColor }]}>No analytics yet.</Text>
        <Text style={[styles.emptySubText, { color: contrastColor, opacity: 0.5 }]}>Keep logging moods to unlock insights.</Text>
        {onRefresh && (
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <Icon name="refresh" size={16} color="#fff" />
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const {
    mood_distribution = [],
    daily_breakdown = [],
    summary = {},
    total_entries = 0,
  } = analyticsData;

  // Build distribution from mood_frequency if mood_distribution is not provided
  const distribution = mood_distribution.length > 0
    ? mood_distribution
    : Object.entries(analyticsData.mood_frequency || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([label, count]) => ({
          label,
          count,
          color: getMoodColor(label),
        }));

  const totalLogs = distribution.reduce((a, c) => a + c.count, 0) || total_entries;
  const streak = summary?.streak || analyticsData?.streak || 0;
  const avgConfidence = summary?.avg_confidence ?? analyticsData?.avg_confidence ?? 0;
  const topMood = summary?.top_mood || analyticsData?.most_common || 'N/A';

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 48 }}
    >
      {/* Header */}
      <Animated.View style={{ opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
        <Text style={[styles.pageTitle, { color: contrastColor }]}>Emotional Journey</Text>
        <Text style={[styles.pageSubtitle, { color: contrastColor, opacity: 0.5 }]}>
          Last 30 days · {totalLogs} {totalLogs === 1 ? 'entry' : 'entries'}
        </Text>
      </Animated.View>

      {/* Stat cards */}
      <View style={styles.statsGrid}>
        <StatCard title="Entries" value={totalLogs} icon="calendar-check" color="#6c5ce7" delay={0} />
        <StatCard title="Streak" value={streak} suffix=" days" icon="fire" color="#e17055" delay={80} />
        <StatCard title="Confidence" value={Math.round(avgConfidence * 100)} suffix="%" icon="shield-check" color="#00b894" delay={160} />
        <StatCard title="Top Mood" value={0} icon="emoticon-happy-outline" color="#fd79a8" delay={240}
          // override for string value
        />
      </View>
      {/* Top mood card overrides */}
      <View style={[styles.topMoodBanner, { borderColor: '#fd79a8' + '40' }]}>
        <Text style={styles.topMoodEmoji}>{getMoodEmoji(topMood)}</Text>
        <View>
          <Text style={styles.topMoodLabel}>Dominant Vibe</Text>
          <Text style={[styles.topMoodName, { color: getMoodColor(topMood) }]}>
            {topMood.charAt(0).toUpperCase() + topMood.slice(1)}
          </Text>
        </View>
        <View style={[styles.topMoodPill, { backgroundColor: getMoodColor(topMood) + '20' }]}>
          <Text style={[styles.topMoodPillText, { color: getMoodColor(topMood) }]}>
            #{1}
          </Text>
        </View>
      </View>

      {/* Daily Trend */}
      {daily_breakdown.length > 1 && (
        <SectionCard title="Daily Trend" icon="chart-line" iconColor="#6c5ce7" accentColor="#6c5ce7">
          <LineChart dailyData={daily_breakdown} />
        </SectionCard>
      )}

      {/* Mood Donut */}
      {distribution.length > 0 && (
        <SectionCard title="Mood Distribution" icon="chart-donut" iconColor="#fd79a8" accentColor="#fd79a8">
          <DonutChart data={distribution} total={totalLogs} />
        </SectionCard>
      )}

      {/* Horizontal bar breakdown */}
      {distribution.length > 0 && (
        <SectionCard title="Breakdown" icon="format-list-bulleted" iconColor="#00b894" accentColor="#00b894">
          <BarChart data={distribution.slice(0, 8)} total={totalLogs} />
        </SectionCard>
      )}

      {/* 28-day Heatmap */}
      {daily_breakdown.length > 0 && (
        <SectionCard title="Activity Heatmap" icon="calendar-month" iconColor="#e17055" accentColor="#e17055">
          <MoodHeatmap dailyData={daily_breakdown} />
        </SectionCard>
      )}

      {/* AI Insight */}
      {summary?.ai_insight && (
        <SectionCard title="AI Insight" icon="auto-fix" iconColor="#f1c40f" accentColor="#f1c40f">
          <Text style={styles.insightText}>{summary.ai_insight}</Text>
        </SectionCard>
      )}

      {/* Refresh */}
      {onRefresh && (
        <TouchableOpacity style={styles.fullRefreshButton} onPress={onRefresh}>
          <Icon name="refresh" size={15} color="#aaa" />
          <Text style={styles.fullRefreshText}>Sync Latest Data</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

// ─── Mood Metadata Helpers ────────────────────────────────────────────────────

const MOOD_COLORS = {
  calm: '#A8E6CF', peaceful: '#B2E2F2', serene: '#D4F1F4', minimalist: '#D0D0D0',
  happy: '#FFDE7D', energetic: '#FFD93D', playful: '#FF8B94', vibrant: '#6BCB77',
  sad: '#A2D2FF', lonely: '#6C757D', pensive: '#4A4E69', gloomy: '#9A8C98',
  anxious: '#D4A5A5', chaotic: '#E94560', intense: '#FF4D4D', gritty: '#666',
  nostalgic: '#FFAAA5', romantic: '#FFB7B2', mystical: '#9D4EDD', vintage: '#B08968',
  cozy: '#E6A15C', ethereal: '#B8C0FF', melancholic: '#4E6E81', industrial: '#545B64',
  natural: '#4A7C59', futuristic: '#00F5D4', bold: '#F15BB5', solitary: '#8D99AE',
  tense: '#D90429', hopeful: '#FEE440',
};

const MOOD_EMOJIS = {
  calm: '😌', peaceful: '🕊️', serene: '🧘', minimalist: '⚪', happy: '😊',
  energetic: '⚡', playful: '🎈', vibrant: '🌈', sad: '😢', lonely: '👤',
  pensive: '🤔', gloomy: '☁️', anxious: '😰', chaotic: '🌀', intense: '🔥',
  gritty: '⛓️', nostalgic: '📺', romantic: '❤️', mystical: '✨', vintage: '🎞️',
  cozy: '🕯️', ethereal: '🌫️', melancholic: '🥀', industrial: '⚙️', natural: '🌲',
  futuristic: '🤖', bold: '🏎️', solitary: '🏔️', tense: '⚠️', hopeful: '🌅',
};

const getMoodColor = (mood) => MOOD_COLORS[mood?.toLowerCase()] || '#6c5ce7';
const getMoodEmoji = (mood) => MOOD_EMOJIS[mood?.toLowerCase()] || '🌈';

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  centerContainer: { minHeight: 380, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 15, fontWeight: '600', marginTop: 8 },
  emptyText: { fontSize: 18, fontWeight: '800' },
  emptySubText: { fontSize: 13 },
  refreshButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#6c5ce7', paddingVertical: 10, paddingHorizontal: 24,
    borderRadius: 20, marginTop: 8,
  },
  refreshButtonText: { color: '#fff', fontWeight: '700' },
  pageTitle: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5, marginTop: 8 },
  pageSubtitle: { fontSize: 13, fontWeight: '600', marginTop: 2, marginBottom: 20 },

  // Stat grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  statCard: {
    width: (SCREEN_WIDTH - 58) / 2,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    elevation: 3,
    shadowColor: '#6c5ce7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    gap: 6,
  },
  statIconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  statTitle: { fontSize: 11, color: '#aaa', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 26, fontWeight: '900', letterSpacing: -1 },

  // Top mood banner
  topMoodBanner: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
    borderWidth: 1,
    elevation: 3,
    shadowColor: '#fd79a8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 10,
  },
  topMoodEmoji: { fontSize: 38 },
  topMoodLabel: { fontSize: 11, color: '#aaa', fontWeight: '700', textTransform: 'uppercase' },
  topMoodName: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  topMoodPill: { marginLeft: 'auto', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  topMoodPillText: { fontSize: 12, fontWeight: '800' },

  // Section card
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
    elevation: 3,
    shadowColor: '#6c5ce7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    overflow: 'hidden',
  },
  sectionCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  sectionIconWrap: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  sectionCardTitle: { fontSize: 16, fontWeight: '800', color: '#2d3436' },

  // Donut
  donutContainer: { alignItems: 'center' },
  legendContainer: { width: '100%', gap: 6, marginTop: 10 },
  legendItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10,
  },
  legendItemActive: { backgroundColor: '#F7F6FF' },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: '#2d3436', textTransform: 'capitalize' },
  legendCount: { fontSize: 13, fontWeight: '800' },

  // Line chart
  chartEmpty: { height: 100, justifyContent: 'center', alignItems: 'center', gap: 8 },
  chartEmptyText: { color: '#ccc', fontSize: 13 },

  // Bar chart
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { width: 72, fontSize: 12, fontWeight: '600', color: '#555', textTransform: 'capitalize', textAlign: 'right' },
  barTrack: {
    flex: 1, height: 22, backgroundColor: '#F3F2FF',
    borderRadius: 6, overflow: 'hidden',
  },
  barFill: { height: '100%' },
  barPct: { width: 36, fontSize: 11, fontWeight: '800', textAlign: 'right' },

  // Heatmap
  heatmapContainer: { alignItems: 'center', gap: 8 },
  heatmapDayLabels: { flexDirection: 'row', gap: 2, alignSelf: 'flex-start' },
  heatmapDayLabel: { width: 32, textAlign: 'center', fontSize: 10, fontWeight: '700', color: '#aaa' },
  heatmapGrid: { flexDirection: 'row', flexWrap: 'wrap', width: 7 * (28 + 4) },
  heatmapCell: { justifyContent: 'center', alignItems: 'center' },
  heatmapCellText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  heatmapLegend: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  heatmapLegendCell: { width: 14, height: 14, borderRadius: 3 },
  heatmapLegendLabel: { fontSize: 10, color: '#aaa', fontWeight: '600' },

  // Insight
  insightText: { fontSize: 14, lineHeight: 22, color: '#2d3436', fontStyle: 'italic' },

  // Refresh
  fullRefreshButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, gap: 6 },
  fullRefreshText: { fontSize: 13, color: '#bbb', fontWeight: '600' },
});

export default AnalyticsDisplay;