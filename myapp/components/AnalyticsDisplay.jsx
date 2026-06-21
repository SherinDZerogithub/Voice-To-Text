import React, {useEffect, useRef, useState, useMemo, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
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
} from 'react-native-svg';
import {getContrastColor} from '../utils/colors';
import GoalCompletionModal, {COMPLETION_THRESHOLD} from './GoalCompletionModal';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import VibeRadarChart from './VibeRadarChart';

const ANALYTICS_HORIZONTAL_PADDING = 20;
const CHART_HEIGHT = 180;
const DEFAULT_CONTENT_WIDTH = 320;

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

const POSITIVE_GOAL_VIBES = [
  'happy','hopeful','calm','peaceful','serene','energetic','playful',
  'vibrant','romantic','cozy','ethereal','natural','bold','mystical','futuristic','minimalist',
];

const GOAL_VIBE_QUOTES = {
  happy: 'Choose joy, then let it choose you back.',
  hopeful: 'Small sparks can still light the whole room.',
  calm: 'Soft breath, steady heart, clear next step.',
  peaceful: 'Peace grows when you give it a little room.',
  serene: 'Quiet confidence looks good on you.',
  energetic: 'Bring the spark, keep the rhythm.',
  playful: 'Make room for tiny ridiculous wins.',
  vibrant: 'Let your color take up space today.',
  romantic: 'Lead with warmth and notice what softens.',
  cozy: 'Comfort counts. Let it recharge you.',
  ethereal: 'Dreamy can still be deeply grounded.',
  natural: 'Return to what feels honest and alive.',
  bold: 'Pick courage. It gets easier with reps.',
  mystical: 'Follow the shimmer, but pack snacks.',
  futuristic: 'Build the mood you want to live in.',
  minimalist: 'Less noise, more signal.',
};

const MOOD_EMOJIS = {
  calm: '😌', peaceful: '🕊️', serene: '🧘', minimalist: '⚪',
  happy: '😊', energetic: '⚡', playful: '🎈', vibrant: '🌈',
  sad: '😢', lonely: '👤', pensive: '🤔', gloomy: '☁️',
  anxious: '😰', chaotic: '🌀', intense: '🔥', gritty: '⛓️',
  nostalgic: '📺', romantic: '❤️', mystical: '✨', vintage: '🎞️',
  cozy: '🕯️', ethereal: '🌫️', melancholic: '🥀', industrial: '⚙️',
  natural: '🌲', futuristic: '🤖', bold: '🏎️', solitary: '🏔️',
  tense: '⚠️', hopeful: '🌅',
};

const getMoodColor = mood => MOOD_COLORS[mood?.toLowerCase()] || '#6c5ce7';
const getMoodEmoji = mood => MOOD_EMOJIS[mood?.toLowerCase()] || '🌈';
const isPositiveGoalVibe = vibe => POSITIVE_GOAL_VIBES.includes(vibe?.toLowerCase());
const getGoalVibes = moodGoal =>
  (Array.isArray(moodGoal?.vibes) && moodGoal.vibes.length > 0
    ? moodGoal.vibes
    : moodGoal?.vibe ? [moodGoal.vibe] : []
  ).map(vibe => vibe?.toLowerCase()).filter(isPositiveGoalVibe).slice(0, 3);
const SECTION_CARD_PADDING = 20;
const DONUT_SIZE = 200;
const DONUT_RADIUS = 70;
const DONUT_STROKE = 28;
const GOAL_WINDOW_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// ─── Utility ──────────────────────────────────────────────────────────────────

const polarToCartesian = (cx, cy, r, angleDeg) => {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad)};
};

const describeArc = (cx, cy, r, startAngle, endAngle) => {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const large = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y}`;
};

const getDateOnly = date => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getLastSevenDayBreakdown = dailyBreakdown => {
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (GOAL_WINDOW_DAYS - 1));
  const cutoffKey = getDateOnly(cutoff);

  return dailyBreakdown.filter(day => day?.date >= cutoffKey);
};

const getGoalWindowBreakdown = (dailyBreakdown, moodGoal) => {
  const updatedAt = moodGoal?.updated_at ? new Date(moodGoal.updated_at) : null;

  if (!updatedAt || Number.isNaN(updatedAt.getTime())) {
    return getLastSevenDayBreakdown(dailyBreakdown);
  }

  const start = new Date(updatedAt);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + (GOAL_WINDOW_DAYS - 1));

  const startKey = getDateOnly(start);
  const endKey = getDateOnly(end);

  return dailyBreakdown.filter(day => day?.date >= startKey && day?.date <= endKey);
};

const getGoalWindowStatus = moodGoal => {
  const updatedAt = moodGoal?.updated_at ? new Date(moodGoal.updated_at) : null;

  if (!updatedAt || Number.isNaN(updatedAt.getTime())) {
    return {
      daysElapsed: 0,
      daysRemaining: GOAL_WINDOW_DAYS,
      isWindowComplete: false,
    };
  }

  const elapsedMs = Math.max(0, Date.now() - updatedAt.getTime());
  const daysElapsed = Math.floor(elapsedMs / MS_PER_DAY);

  return {
    daysElapsed,
    daysRemaining: Math.max(0, GOAL_WINDOW_DAYS - daysElapsed),
    isWindowComplete: elapsedMs >= GOAL_WINDOW_DAYS * MS_PER_DAY,
  };
};

// ─── Animated Number ──────────────────────────────────────────────────────────

const AnimatedNumber = ({value, duration = 800, style, suffix = ''}) => {
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    anim.setValue(0);
    const animation = Animated.timing(anim, {
      toValue: value,
      duration,
      useNativeDriver: false,
    });
    animation.start();
    const id = anim.addListener(({value: v}) => {
      if (isMounted.current) setDisplay(Math.round(v));
    });
    return () => {
      animation.stop();
      anim.removeListener(id);
    };
  }, [value]);

  return (
    <Text style={style}>
      {display}
      {suffix}
    </Text>
  );
};

// ─── Animated Progress Bar ────────────────────────────────────────────────────

const AnimatedProgressBar = ({progress, color}) => {
  const animWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    animWidth.setValue(0);
    Animated.spring(animWidth, {
      toValue: progress,
      tension: 40,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  return (
    <View style={styles.goalProgressTrack}>
      <Animated.View
        style={[
          styles.goalProgressBar,
          {
            backgroundColor: color,
            width: animWidth.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
              extrapolate: 'clamp',
            }),
          },
        ]}
      />
    </View>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

const StatCard = ({title, value, icon, color, suffix = '', delay = 0, style}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    const anim = Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 450,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 55,
        friction: 8,
        delay,
        useNativeDriver: true,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  }, []);

  const numericValue =
    typeof value === 'number' ? value : parseFloat(value) || 0;

  return (
    <Animated.View
      style={[
        styles.statCard,
        style,
        {opacity: fadeAnim, transform: [{translateY: slideAnim}]},
      ]}>
      <View style={[styles.statIconWrap, {backgroundColor: color + '1A'}]}>
        <Icon name={icon} size={22} color={color} />
      </View>
      <Text style={styles.statTitle}>{title}</Text>
      <AnimatedNumber
        value={numericValue}
        suffix={suffix}
        style={[styles.statValue, {color}]}
      />
    </Animated.View>
  );
};

// ─── Donut Chart ──────────────────────────────────────────────────────────────

const DonutChart = ({data, total}) => {
  // Use a key-based remount approach for clean re-animation on data change
  const [progress, setProgress] = useState(0);
  const [activeIndex, setActiveIndex] = useState(null);
  const animProgress = useRef(new Animated.Value(0)).current;
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // FIX: Reset and re-animate whenever data changes (use JSON key to detect content changes)
  const dataKey = useMemo(() => JSON.stringify(data.map(d => d.count)), [data]);

  useEffect(() => {
    setProgress(0);
    setActiveIndex(null);
    animProgress.setValue(0);
    const animation = Animated.timing(animProgress, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: false,
    });
    animation.start();
    const id = animProgress.addListener(({value}) => {
      if (isMounted.current) setProgress(value);
    });
    return () => {
      animation.stop();
      animProgress.removeListener(id);
    };
  }, [dataKey]);

  const cx = DONUT_SIZE / 2;
  const cy = DONUT_SIZE / 2;

  const slices = useMemo(() => {
    let cumAngle = 0;
    return data.map(item => {
      const pct = total > 0 ? item.count / total : 0;
      const angle = pct * 360;
      const start = cumAngle;
      cumAngle += angle;
      return {...item, startAngle: start, endAngle: cumAngle, pct};
    });
  }, [data, total]);

  const centerLabel = activeIndex !== null ? slices[activeIndex] : null;

  return (
    <View style={styles.donutContainer}>
      <Svg width={DONUT_SIZE} height={DONUT_SIZE}>
        <Circle
          cx={cx}
          cy={cy}
          r={DONUT_RADIUS}
          fill="none"
          stroke="#F0F0F5"
          strokeWidth={DONUT_STROKE}
        />
        {slices.map((slice, i) => {
          const drawnEnd =
            slice.startAngle + (slice.endAngle - slice.startAngle) * progress;
          if (drawnEnd <= slice.startAngle) return null;
          const isActive = activeIndex === i;
          return (
            <Path
              key={i}
              d={describeArc(
                cx,
                cy,
                DONUT_RADIUS,
                slice.startAngle,
                Math.min(drawnEnd, slice.endAngle),
              )}
              fill="none"
              stroke={slice.color || '#6c5ce7'}
              strokeWidth={isActive ? DONUT_STROKE + 6 : DONUT_STROKE}
              strokeLinecap="round"
              onPress={() => setActiveIndex(activeIndex === i ? null : i)}
            />
          );
        })}
        <SvgText
          x={cx}
          y={cy - 10}
          textAnchor="middle"
          fontSize="28"
          fontWeight="bold"
          fill="#2d3436">
          {centerLabel ? Math.round(centerLabel.pct * 100) + '%' : total}
        </SvgText>
        <SvgText
          x={cx}
          y={cy + 14}
          textAnchor="middle"
          fontSize="11"
          fontWeight="600"
          fill="#888">
          {centerLabel ? centerLabel.label : 'ENTRIES'}
        </SvgText>
      </Svg>

      <View style={styles.legendContainer}>
        {slices.map((slice, i) => (
          <TouchableOpacity
            key={i}
            style={[
              styles.legendItem,
              activeIndex === i && styles.legendItemActive,
            ]}
            onPress={() => setActiveIndex(activeIndex === i ? null : i)}
            activeOpacity={0.7}>
            <View
              style={[
                styles.legendDot,
                {backgroundColor: slice.color || '#6c5ce7'},
              ]}
            />
            <Text style={styles.legendLabel} numberOfLines={1}>
              {slice.label}
            </Text>
            <Text
              style={[styles.legendCount, {color: slice.color || '#6c5ce7'}]}>
              {slice.count}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// ─── Line Chart (Daily Trend) ─────────────────────────────────────────────────

const LineChart = ({dailyData, chartWidth}) => {
  const [progress, setProgress] = useState(0);
  const [tooltip, setTooltip] = useState(null);
  const animProgress = useRef(new Animated.Value(0)).current;
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // FIX: Use JSON key to detect actual data content changes
  const dataKey = useMemo(
    () => JSON.stringify(dailyData?.map(d => `${d.date}:${d.total_entries}`)),
    [dailyData],
  );

  useEffect(() => {
    setProgress(0);
    setTooltip(null);
    animProgress.setValue(0);
    const animation = Animated.timing(animProgress, {
      toValue: 1,
      duration: 1400,
      useNativeDriver: false,
    });
    animation.start();
    const id = animProgress.addListener(({value}) => {
      if (isMounted.current) setProgress(value);
    });
    return () => {
      animation.stop();
      animProgress.removeListener(id);
    };
  }, [dataKey]);

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
  const safeChartWidth = Math.max(chartWidth || DEFAULT_CONTENT_WIDTH, 240);
  const W = Math.max(safeChartWidth - PAD_L - PAD_R, 1);
  const H = CHART_HEIGHT - PAD_T - PAD_B;

  const maxVal = Math.max(...dailyData.map(d => d.total_entries), 1);

  const toX = i => PAD_L + (i / (dailyData.length - 1)) * W;
  const toY = v => PAD_T + H - (v / maxVal) * H;

  const buildPath = () => {
    const pts = dailyData.map((d, i) => ({x: toX(i), y: toY(d.total_entries)}));
    const totalPoints = Math.max(2, Math.floor(pts.length * progress));
    const visiblePts = pts.slice(0, totalPoints);
    if (visiblePts.length < 2) return '';
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
    const pts = dailyData.map((d, i) => ({x: toX(i), y: toY(d.total_entries)}));
    const totalPoints = Math.max(2, Math.floor(pts.length * progress));
    const visiblePts = pts.slice(0, totalPoints);
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

  const step = Math.ceil(dailyData.length / 5);
  const xLabels = dailyData
    .map((d, i) => ({...d, idx: i}))
    .filter((_, i) => i % step === 0 || i === dailyData.length - 1);

  const linePath = buildPath();
  const areaPath = buildAreaPath();

  return (
    <View>
      <Svg width={safeChartWidth} height={CHART_HEIGHT}>
        <Defs>
          <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#6c5ce7" stopOpacity="0.25" />
            <Stop offset="100%" stopColor="#6c5ce7" stopOpacity="0.02" />
          </LinearGradient>
        </Defs>
        {gridLines.map((g, i) => (
          <G key={i}>
            <Line
              x1={PAD_L}
              y1={g.y}
              x2={PAD_L + W}
              y2={g.y}
              stroke="#F0EFF8"
              strokeWidth="1"
              strokeDasharray="4 3"
            />
            <SvgText
              x={PAD_L - 6}
              y={g.y + 4}
              textAnchor="end"
              fontSize="9"
              fill="#BBB"
              fontWeight="600">
              {g.label}
            </SvgText>
          </G>
        ))}
        {areaPath ? <Path d={areaPath} fill="url(#areaGrad)" /> : null}
        {linePath ? (
          <Path
            d={linePath}
            fill="none"
            stroke="#6c5ce7"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
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
              onPress={() =>
                setTooltip(tooltip?.index === i ? null : {index: i, ...d})
              }
            />
          );
        })}
        {tooltip &&
          (() => {
            const tx = toX(tooltip.index);
            const ty = toY(tooltip.total_entries);
            const boxW = 70;
            const boxH = 38;
            const bx = Math.max(
              4,
              Math.min(tx - boxW / 2, safeChartWidth - boxW - 4),
            );
            const by = Math.max(PAD_T, ty - boxH - 10);
            return (
              <G>
                <Rect
                  x={bx}
                  y={by}
                  width={boxW}
                  height={boxH}
                  rx="8"
                  fill="#2d3436"
                  opacity="0.92"
                />
                <SvgText
                  x={bx + boxW / 2}
                  y={by + 14}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#fff"
                  fontWeight="bold">
                  {tooltip.date?.slice(5)}
                </SvgText>
                <SvgText
                  x={bx + boxW / 2}
                  y={by + 28}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#a29bfe">
                  {tooltip.total_entries}{' '}
                  {tooltip.total_entries === 1 ? 'entry' : 'entries'}
                </SvgText>
              </G>
            );
          })()}
        {xLabels.map(d => (
          <SvgText
            key={d.idx}
            x={toX(d.idx)}
            y={PAD_T + H + 18}
            textAnchor="middle"
            fontSize="9"
            fill="#AAA"
            fontWeight="600">
            {d.date?.slice(5)}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
};

// ─── Bar Chart (Mood Frequency) ───────────────────────────────────────────────

const BarChart = ({data, total, chartWidth}) => {
  const BAR_H = 36;
  const GAP = 10;
  const PAD_L = 80;
  const PAD_R = 50;
  const W = Math.max((chartWidth || DEFAULT_CONTENT_WIDTH) - PAD_L - PAD_R, 1);

  // FIX: Rebuild animated values when data *content* changes, not just length.
  // Store as ref keyed by a stable data signature.
  const dataSignature = useMemo(
    () => data.map(d => `${d.label}:${d.count}`).join(','),
    [data],
  );
  const animWidthsRef = useRef({sig: '', anims: []});

  if (animWidthsRef.current.sig !== dataSignature) {
    animWidthsRef.current = {
      sig: dataSignature,
      anims: data.map(() => new Animated.Value(0)),
    };
  }
  const animWidths = animWidthsRef.current.anims;

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
  }, [dataSignature, total, W]);

  const chartH = data.length * (BAR_H + GAP);

  return (
    <View style={{height: chartH}}>
      {data.map((item, i) => {
        const pct = total > 0 ? (item.count / total) * 100 : 0;
        return (
          <View
            key={item.label}
            style={[styles.barRow, {height: BAR_H, marginBottom: GAP}]}>
            <Text style={styles.barLabel} numberOfLines={1}>
              {item.label}
            </Text>
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
            <Text style={[styles.barPct, {color: item.color || '#6c5ce7'}]}>
              {Math.round(pct)}%
            </Text>
          </View>
        );
      })}
    </View>
  );
};

// ─── Fandom Character Match ───────────────────────────────────────────────────

const FANDOM_CHARACTERS = {
  happy: [
    {name: 'Tohru Honda', show: 'Fruits Basket', type: 'anime', trait: 'radiates warmth and pure joy', emoji: '🌸'},
    {name: 'Park Saeroyi', show: 'Itaewon Class', type: 'kdrama', trait: 'relentless optimism and drive', emoji: '🍺'},
    {name: 'Ted Lasso', show: 'Ted Lasso', type: 'tv', trait: 'infectious positivity always', emoji: '🍪'},
  ],
  calm: [
    {name: 'Shouto Todoroki', show: 'My Hero Academia', type: 'anime', trait: 'quietly grounded and composed', emoji: '🧊'},
    {name: 'Kim Dok-mi', show: 'Flower Boy Next Door', type: 'kdrama', trait: 'peaceful solitude and reflection', emoji: '📚'},
    {name: 'Bob Belcher', show: "Bob's Burgers", type: 'tv', trait: 'steady, warm, unshakeable calm', emoji: '🍔'},
  ],
  sad: [
    {name: 'Violet Evergarden', show: 'Violet Evergarden', type: 'anime', trait: 'carries grief with quiet grace', emoji: '💌'},
    {name: 'Yoon Seri', show: 'Crash Landing on You', type: 'kdrama', trait: 'vulnerability beneath the strength', emoji: '🪂'},
    {name: 'BoJack Horseman', show: 'BoJack Horseman', type: 'tv', trait: 'wrestling with deep inner sadness', emoji: '🌊'},
  ],
  anxious: [
    {name: 'Shinji Ikari', show: 'Neon Genesis Evangelion', type: 'anime', trait: 'overthinks but still shows up', emoji: '🤖'},
    {name: 'Han Ji-pyeong', show: 'Start-Up', type: 'kdrama', trait: 'anxiety masked by sharp wit', emoji: '💼'},
    {name: 'Eleanor Shellstrop', show: 'The Good Place', type: 'tv', trait: 'spiraling but secretly determined', emoji: '😬'},
  ],
  energetic: [
    {name: 'Rock Lee', show: 'Naruto', type: 'anime', trait: 'pure unstoppable energy', emoji: '💥'},
    {name: 'Do Kyung-seok', show: 'My ID is Gangnam Beauty', type: 'kdrama', trait: 'driven by fierce inner fire', emoji: '🏃'},
    {name: 'Jake Peralta', show: 'Brooklyn Nine-Nine', type: 'tv', trait: 'chaotic, fun, full-throttle energy', emoji: '🚔'},
  ],
  angry: [
    {name: 'Levi Ackerman', show: 'Attack on Titan', type: 'anime', trait: 'controlled fury with purpose', emoji: '⚔️'},
    {name: 'Ji Sung-joon', show: 'She Was Pretty', type: 'kdrama', trait: 'sharp edges hiding a soft heart', emoji: '🗞️'},
    {name: 'Zuko', show: 'Avatar: The Last Airbender', type: 'cartoon', trait: 'anger on the path to redemption', emoji: '🔥'},
  ],
  lonely: [
    {name: 'Hachiman Hikigaya', show: 'My Teen Romantic Comedy SNAFU', type: 'anime', trait: 'lonely but deeply self-aware', emoji: '🎭'},
    {name: 'Oh Il-nam', show: 'Squid Game', type: 'kdrama', trait: 'isolation hidden behind smiles', emoji: '🎮'},
    {name: 'Aang', show: 'Avatar: The Last Airbender', type: 'cartoon', trait: 'last of his kind, never gives up', emoji: '💨'},
  ],
  nostalgic: [
    {name: 'Chihiro', show: "Spirited Away", type: 'anime', trait: 'longing to return to what was', emoji: '🏮'},
    {name: 'Go Eun-tak', show: 'Goblin', type: 'kdrama', trait: 'romance tinged with longing', emoji: '🕯️'},
    {name: 'Kevin McCallister', show: 'Home Alone', type: 'movie', trait: 'aches for home and family', emoji: '🏠'},
  ],
  pensive: [
    {name: 'Gintoki Sakata', show: 'Gintama', type: 'anime', trait: 'reflects deeply beneath the comedy', emoji: '🍡'},
    {name: 'Baek In-ho', show: 'Cheese in the Trap', type: 'kdrama', trait: 'philosophical about life and loss', emoji: '🎹'},
    {name: 'Bojack Horseman', show: 'BoJack Horseman', type: 'tv', trait: 'contemplative, messy, honest', emoji: '🌙'},
  ],
  cozy: [
    {name: 'Yotsuba', show: 'Yotsuba&!', type: 'anime', trait: 'finds magic in the ordinary', emoji: '🌻'},
    {name: 'Eun Dan-oh', show: 'Extraordinary You', type: 'kdrama', trait: 'soft joy in simple moments', emoji: '🌼'},
    {name: 'Moana', show: 'Moana', type: 'movie', trait: 'at peace with herself and the world', emoji: '🌊'},
  ],
};

const TYPE_BADGE = {
  anime: {label: 'Anime', color: '#ff7675', bg: '#ff767520'},
  kdrama: {label: 'K-Drama', color: '#00cec9', bg: '#00cec920'},
  tv: {label: 'TV Show', color: '#6c5ce7', bg: '#6c5ce720'},
  cartoon: {label: 'Cartoon', color: '#fdcb6e', bg: '#fdcb6e20'},
  movie: {label: 'Movie', color: '#fd79a8', bg: '#fd79a820'},
};

const STORY_ARCS = [
  {
    id: 'hero',
    title: 'The Hero\'s Journey',
    description: 'You\'ve been riding a wave of high energy — this is your training arc. Think Naruto before the chunin exams.',
    condition: d => (d.find(x => x.label === 'energetic' || x.label === 'happy')?.count || 0) / (d.reduce((a,b)=>a+b.count,0)||1) > 0.4,
    emoji: '⚡',
    color: '#fdcb6e',
    character: {name: 'Naruto Uzumaki', show: 'Naruto', line: '"I never go back on my word — that\'s my nindo!"'},
  },
  {
    id: 'healing',
    title: 'The Healing Arc',
    description: 'Your mood shows softness and introspection. Like Violet Evergarden learning to feel again, you\'re processing.',
    condition: d => (d.find(x => x.label === 'sad' || x.label === 'lonely' || x.label === 'pensive')?.count || 0) / (d.reduce((a,b)=>a+b.count,0)||1) > 0.35,
    emoji: '💜',
    color: '#a29bfe',
    character: {name: 'Violet Evergarden', show: 'Violet Evergarden', line: '"I want to understand these human emotions."'},
  },
  {
    id: 'slowburn',
    title: 'The Slow Burn',
    description: 'Calm and steady — you\'re in your cozy kdrama era. Building something beautiful without rushing.',
    condition: d => (d.find(x => x.label === 'calm' || x.label === 'cozy')?.count || 0) / (d.reduce((a,b)=>a+b.count,0)||1) > 0.35,
    emoji: '🕯️',
    color: '#fd79a8',
    character: {name: 'Ri Jeong-hyeok', show: 'Crash Landing on You', line: '"Even if I can\'t have you, the world you\'re in is enough."'},
  },
  {
    id: 'chaos',
    title: 'The Chaotic Arc',
    description: 'Mixed signals, big feelings — you\'re in a plot twist episode. Even Gintoki would respect the chaos.',
    condition: () => true,
    emoji: '🌀',
    color: '#00b894',
    character: {name: 'Gintoki Sakata', show: 'Gintama', line: '"If you can\'t fight back tears, fight with them flowing."'},
  },
];

const FandomCharacterMatch = ({topMood, distribution, totalLogs}) => {
  const [selectedType, setSelectedType] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const chars = FANDOM_CHARACTERS[topMood?.toLowerCase()] || FANDOM_CHARACTERS.pensive;
  const filtered = selectedType ? chars.filter(c => c.type === selectedType) : chars;
  const displayChars = filtered.length > 0 ? filtered : chars;

  const toggleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    Animated.spring(slideAnim, {toValue: next ? 1 : 0, friction: 8, useNativeDriver: false}).start();
  };

  const types = [...new Set(chars.map(c => c.type))];

  return (
    <SectionCard title="Your Fandom Twin" icon="account-star" iconColor="#fd79a8" accentColor="#fd79a8">
      <Text style={fanStyles.intro}>
        Your dominant mood is <Text style={{fontWeight:'800', color: getMoodColor(topMood)}}>{topMood}</Text> — here are the characters who get you:
      </Text>

      {/* Type filter */}
      <View style={fanStyles.typeRow}>
        <TouchableOpacity
          style={[fanStyles.typePill, !selectedType && fanStyles.typePillActive]}
          onPress={() => setSelectedType(null)}>
          <Text style={[fanStyles.typePillText, !selectedType && fanStyles.typePillTextActive]}>All</Text>
        </TouchableOpacity>
        {types.map(t => {
          const badge = TYPE_BADGE[t] || {label: t, color: '#888', bg: '#88888820'};
          const isActive = selectedType === t;
          return (
            <TouchableOpacity
              key={t}
              style={[fanStyles.typePill, {borderColor: badge.color}, isActive && {backgroundColor: badge.bg}]}
              onPress={() => setSelectedType(isActive ? null : t)}>
              <Text style={[fanStyles.typePillText, {color: isActive ? badge.color : '#888'}]}>{badge.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Character cards */}
      {displayChars.map((char, i) => {
        const badge = TYPE_BADGE[char.type] || {label: char.type, color: '#888', bg: '#88888820'};
        return (
          <View key={i} style={fanStyles.charCard}>
            <Text style={fanStyles.charEmoji}>{char.emoji}</Text>
            <View style={{flex: 1}}>
              <View style={fanStyles.charHeader}>
                <Text style={fanStyles.charName}>{char.name}</Text>
                <View style={[fanStyles.typeBadge, {backgroundColor: badge.bg}]}>
                  <Text style={[fanStyles.typeBadgeText, {color: badge.color}]}>{badge.label}</Text>
                </View>
              </View>
              <Text style={fanStyles.charShow}>from {char.show}</Text>
              <Text style={fanStyles.charTrait}>{char.trait}</Text>
            </View>
          </View>
        );
      })}

      <TouchableOpacity style={fanStyles.moreBtn} onPress={toggleExpand}>
        <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color="#fd79a8" />
        <Text style={fanStyles.moreBtnText}>{expanded ? 'Show less' : 'Tell me more about my vibe'}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={fanStyles.expandedSection}>
          <Text style={fanStyles.expandedTitle}>What this means for you</Text>
          {distribution.slice(0, 4).map((item, i) => {
            const chars2 = FANDOM_CHARACTERS[item.label?.toLowerCase()];
            if (!chars2) return null;
            const pick = chars2[0];
            return (
              <View key={i} style={fanStyles.miniRow}>
                <Text style={fanStyles.miniMood}>{getMoodEmoji(item.label)} {item.label}</Text>
                <Text style={fanStyles.miniChar}>→ {pick.emoji} {pick.name}</Text>
              </View>
            );
          })}
        </View>
      )}
    </SectionCard>
  );
};

const fanStyles = StyleSheet.create({
  intro: {fontSize: 13, color: '#555', lineHeight: 19, marginBottom: 12},
  typeRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14},
  typePill: {paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: '#ddd'},
  typePillActive: {backgroundColor: '#fd79a820', borderColor: '#fd79a8'},
  typePillText: {fontSize: 11, fontWeight: '700', color: '#888'},
  typePillTextActive: {color: '#fd79a8'},
  charCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#fdf4ff',
    borderRadius: 14,
    padding: 13,
    marginBottom: 8,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#fd79a820',
  },
  charEmoji: {fontSize: 28, marginTop: 2},
  charHeader: {flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2},
  charName: {fontSize: 14, fontWeight: '800', color: '#2d3436'},
  typeBadge: {paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8},
  typeBadgeText: {fontSize: 10, fontWeight: '700'},
  charShow: {fontSize: 11, color: '#999', fontWeight: '600', marginBottom: 4},
  charTrait: {fontSize: 12, color: '#555', lineHeight: 17},
  moreBtn: {flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 6, justifyContent: 'center'},
  moreBtnText: {fontSize: 12, color: '#fd79a8', fontWeight: '700'},
  expandedSection: {
    backgroundColor: '#f8f0ff',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    gap: 8,
  },
  expandedTitle: {fontSize: 12, fontWeight: '800', color: '#6c5ce7', marginBottom: 4},
  miniRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  miniMood: {fontSize: 12, color: '#444', fontWeight: '600'},
  miniChar: {fontSize: 11, color: '#888'},
});

// ─── Mood Story Arc ────────────────────────────────────────────────────────────

const MoodStoryArc = ({distribution, totalLogs, weeklyBreakdown}) => {
  const [currentArcIdx, setCurrentArcIdx] = useState(0);
  const [showQuote, setShowQuote] = useState(false);
  const quoteAnim = useRef(new Animated.Value(0)).current;

  const arc = useMemo(() => {
    const found = STORY_ARCS.find(a => a.condition(distribution));
    return found || STORY_ARCS[STORY_ARCS.length - 1];
  }, [distribution]);

  const toggleQuote = () => {
    const next = !showQuote;
    setShowQuote(next);
    Animated.spring(quoteAnim, {toValue: next ? 1 : 0, friction: 8, useNativeDriver: true}).start();
  };

  // Build 7-day vibe timeline
  const timeline = (weeklyBreakdown || []).slice(-7).map(day => {
    const top = Object.entries(day.mood_frequency || {}).sort((a, b) => b[1] - a[1])[0];
    return {date: day.date, mood: top?.[0] || null};
  });

  const scaleY = quoteAnim.interpolate({inputRange: [0, 1], outputRange: [0, 1]});

  return (
    <SectionCard title="Your Story Arc" icon="book-open-variant" iconColor="#a29bfe" accentColor="#a29bfe">
      {/* Arc card */}
      <View style={[arcStyles.arcCard, {borderColor: arc.color + '50', backgroundColor: arc.color + '0A'}]}>
        <Text style={arcStyles.arcEmoji}>{arc.emoji}</Text>
        <View style={{flex: 1}}>
          <Text style={[arcStyles.arcTitle, {color: arc.color}]}>{arc.title}</Text>
          <Text style={arcStyles.arcDesc}>{arc.description}</Text>
        </View>
      </View>

      {/* Character quote toggle */}
      <TouchableOpacity style={[arcStyles.quoteToggle, {borderColor: arc.color + '40'}]} onPress={toggleQuote}>
        <Icon name="format-quote-open" size={16} color={arc.color} />
        <Text style={[arcStyles.quoteToggleText, {color: arc.color}]}>
          {showQuote ? 'Hide' : `What would ${arc.character.name} say?`}
        </Text>
        <Icon name={showQuote ? 'chevron-up' : 'chevron-down'} size={16} color={arc.color} />
      </TouchableOpacity>

      {showQuote && (
        <Animated.View style={[arcStyles.quoteBox, {borderLeftColor: arc.color, transform: [{scaleY}]}]}>
          <Text style={arcStyles.quoteChar}>— {arc.character.name}, {arc.character.show}</Text>
          <Text style={arcStyles.quoteText}>{arc.character.line}</Text>
        </Animated.View>
      )}

      {/* 7-day mood timeline */}
      {timeline.length > 0 && (
        <View style={arcStyles.timeline}>
          <Text style={arcStyles.timelineTitle}>This week's plot</Text>
          <View style={arcStyles.timelineDots}>
            {timeline.map((day, i) => (
              <View key={i} style={arcStyles.timelineItem}>
                <View style={[arcStyles.timelineDot, {backgroundColor: day.mood ? getMoodColor(day.mood) + '30' : '#f0f0f0', borderColor: day.mood ? getMoodColor(day.mood) : '#ddd'}]}>
                  <Text style={arcStyles.timelineMoodEmoji}>{day.mood ? getMoodEmoji(day.mood) : '·'}</Text>
                </View>
                <Text style={arcStyles.timelineDayLabel}>
                  {day.date ? new Date(day.date + 'T00:00:00').toLocaleDateString([], {weekday: 'narrow'}) : '·'}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Story prompt */}
      <View style={arcStyles.promptBox}>
        <Icon name="pencil-box-outline" size={15} color="#a29bfe" />
        <Text style={arcStyles.promptText}>
          <Text style={{fontWeight: '800', color: '#a29bfe'}}>Journal prompt: </Text>
          {arc.id === 'hero' && "What challenge are you training to overcome right now?"}
          {arc.id === 'healing' && "What emotion have you been avoiding, and what might it be telling you?"}
          {arc.id === 'slowburn' && "What are you quietly building for yourself these days?"}
          {arc.id === 'chaos' && "If your life were a drama, what episode title would this week be?"}
        </Text>
      </View>
    </SectionCard>
  );
};

const arcStyles = StyleSheet.create({
  arcCard: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  arcEmoji: {fontSize: 30},
  arcTitle: {fontSize: 15, fontWeight: '900', marginBottom: 4},
  arcDesc: {fontSize: 12, color: '#555', lineHeight: 18},
  quoteToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
    justifyContent: 'center',
  },
  quoteToggleText: {fontSize: 12, fontWeight: '700', flex: 1, textAlign: 'center'},
  quoteBox: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    paddingVertical: 8,
    marginBottom: 14,
    backgroundColor: '#fafafa',
    borderRadius: 8,
  },
  quoteChar: {fontSize: 10, color: '#aaa', fontWeight: '700', marginBottom: 4},
  quoteText: {fontSize: 13, color: '#444', fontStyle: 'italic', lineHeight: 20},
  timeline: {marginBottom: 14},
  timelineTitle: {fontSize: 11, color: '#aaa', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10},
  timelineDots: {flexDirection: 'row', justifyContent: 'space-between'},
  timelineItem: {alignItems: 'center', gap: 4},
  timelineDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  timelineMoodEmoji: {fontSize: 16},
  timelineDayLabel: {fontSize: 9, color: '#bbb', fontWeight: '700'},
  promptBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#f0ecff',
    borderRadius: 10,
    padding: 12,
    alignItems: 'flex-start',
  },
  promptText: {flex: 1, fontSize: 12, color: '#555', lineHeight: 18},
});

 // ─── Section Card ─────────────────────────────────────────────────────────────

const SectionCard = ({
  title,
  icon,
  iconColor = '#6c5ce7',
  children,
  accentColor,
}) => (
  <View
    style={[
      styles.sectionCard,
      accentColor ? {borderTopColor: accentColor, borderTopWidth: 3} : {},
    ]}>
    <View style={styles.sectionCardHeader}>
      <View
        style={[
          styles.sectionIconWrap,
          {backgroundColor: (iconColor || '#6c5ce7') + '18'},
        ]}>
        <Icon name={icon} size={18} color={iconColor} />
      </View>
      <Text style={styles.sectionCardTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const AnalyticsDisplay = ({
  analyticsData,
  appBgColor,
  isLoading,
  onRefresh,
  moodGoal,
  onUpdateGoal,
  moodHistory,
  token,
  backendUrl,
}) => {
  const contrastColor = getContrastColor(appBgColor);
  const headerAnim = useRef(new Animated.Value(0)).current;
  const [showGoalPicker, setShowGoalPicker] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [savedInsights, setSavedInsights] = useState([]);
  const [contentWidth, setContentWidth] = useState(DEFAULT_CONTENT_WIDTH);
  const [previewGoalVibe, setPreviewGoalVibe] = useState(POSITIVE_GOAL_VIBES[0]);
  const selectedGoalVibes = useMemo(() => getGoalVibes(moodGoal), [moodGoal]);
  const [draftGoalVibes, setDraftGoalVibes] = useState(selectedGoalVibes);
  const isDraftGoalValid =
    draftGoalVibes.length > 0 && draftGoalVibes.length <= 3;

  useEffect(() => {
    if (showGoalPicker) {
      setDraftGoalVibes(selectedGoalVibes);
      setPreviewGoalVibe(selectedGoalVibes[0] || POSITIVE_GOAL_VIBES[0]);
    }
  }, [selectedGoalVibes, showGoalPicker]);

  const handleContentLayout = useCallback(event => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    if (nextWidth > 0) {
      setContentWidth(current =>
        Math.abs(current - nextWidth) > 1 ? nextWidth : current,
      );
    }
  }, []);
  useEffect(() => {
    if (analyticsData) {
      headerAnim.setValue(0);
      Animated.spring(headerAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }
  }, [analyticsData]);

  const handleSetGoal = useCallback(
    vibe => {
      if (!isPositiveGoalVibe(vibe)) return;
      setPreviewGoalVibe(vibe);
      const nextGoals = draftGoalVibes.includes(vibe)
        ? draftGoalVibes.filter(goal => goal !== vibe)
        : draftGoalVibes.length >= 3
        ? null
        : [...draftGoalVibes, vibe];
      if (!nextGoals || nextGoals.length === 0) return;
      setDraftGoalVibes(nextGoals);
    },
    [draftGoalVibes],
  );

  const handleCancelGoalPicker = useCallback(() => {
    setDraftGoalVibes(selectedGoalVibes);
    setPreviewGoalVibe(selectedGoalVibes[0] || POSITIVE_GOAL_VIBES[0]);
    setShowGoalPicker(false);
  }, [selectedGoalVibes]);

  const handleSaveGoalPicker = useCallback(() => {
    if (!isDraftGoalValid) return;
    onUpdateGoal?.(draftGoalVibes);
    setShowGoalPicker(false);
  }, [draftGoalVibes, isDraftGoalValid, onUpdateGoal]);

  if (isLoading && !analyticsData) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6c5ce7" />
        <Text style={[styles.loadingText, {color: contrastColor}]}>
          Crunching your mood data…
        </Text>
      </View>
    );
  }

  if (!analyticsData) {
    return (
      <View style={styles.centerContainer}>
        <Icon name="chart-donut-variant" size={64} color="#d0cde8" />
        <Text style={[styles.emptyText, {color: contrastColor}]}>
          No analytics yet.
        </Text>
        <Text
          style={[styles.emptySubText, {color: contrastColor, opacity: 0.5}]}>
          Keep logging moods to unlock insights.
        </Text>
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
    daily_breakdown = [],
    total_entries = 0,
    vibe_scores = {},
  } = analyticsData;

  // FIX: Build distribution from mood_frequency (what the backend actually returns)
  const distribution = Object.entries(analyticsData.mood_frequency || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, count]) => ({
      label,
      count,
      color: getMoodColor(label),
    }));

  const totalLogs =
    distribution.reduce((a, c) => a + c.count, 0) || total_entries;
  const topMood = analyticsData.most_common || distribution[0]?.label || 'N/A';

  // Build goal progress from this goal's own 7-day focus window.
  const weeklyBreakdown = getGoalWindowBreakdown(daily_breakdown, moodGoal);
  const weeklyMoodCounts = weeklyBreakdown.reduce((acc, day) => {
    Object.entries(day.mood_frequency || {}).forEach(([vibe, count]) => {
      acc[vibe.toLowerCase()] = (acc[vibe.toLowerCase()] || 0) + count;
    });
    return acc;
  }, {});
  const weeklyTotalLogs =
    weeklyBreakdown.reduce((sum, day) => sum + (day.total_entries || 0), 0) ||
    Object.values(weeklyMoodCounts).reduce((sum, count) => sum + count, 0);

  // Weekly goal progress is based on the current 7-day focus window.
  // If any selected vibe reaches the weekly threshold, the focus counts as won.
  const goalStats = selectedGoalVibes.map(vibe => {
    const count = weeklyMoodCounts[vibe] || 0;
    const progress = weeklyTotalLogs > 0 ? count / weeklyTotalLogs : 0;
    return {vibe, count, progress};
  });
  const winningGoal =
    goalStats.find(goal => goal.progress >= COMPLETION_THRESHOLD) || null;
  const bestGoal =
    goalStats.reduce(
      (best, goal) => (goal.progress > (best?.progress || 0) ? goal : best),
      null,
    ) || null;
  const activeGoal = winningGoal || bestGoal;
  const goalVibe = activeGoal?.vibe || selectedGoalVibes[0];
  const goalCount = activeGoal?.count || 0;
  const goalProgress = activeGoal?.progress || 0;
  const goalReached = goalProgress >= COMPLETION_THRESHOLD;
  const goalWindowStatus = getGoalWindowStatus(moodGoal);
  const goalFailed = goalWindowStatus.isWindowComplete && !goalReached;
  const goalAccent = getMoodColor(goalVibe);
  const goalDaysLabel = goalWindowStatus.isWindowComplete
    ? '7-day focus ended'
    : `${goalWindowStatus.daysRemaining} day${
        goalWindowStatus.daysRemaining === 1 ? '' : 's'
      } left`;
  const statCardWidth = Math.max((contentWidth - 10) / 2, 136);
  const chartWidth = Math.max(contentWidth - SECTION_CARD_PADDING * 2, 220);

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{paddingBottom: 48}}>
      <View style={styles.contentSizer} onLayout={handleContentLayout}>
      {/* Header */}
      <Animated.View
        style={{
          opacity: headerAnim,
          transform: [
            {
              translateY: headerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [16, 0],
              }),
            },
          ],
        }}>
        <View style={styles.pageHeader}>
          <View>
            <Text style={[styles.pageTitle, {color: contrastColor}]}>
              Emotional Journey
            </Text>
            <Text style={[styles.pageSubtitle, {color: contrastColor, opacity: 0.5}]}>
              Last 30 days · {totalLogs} {totalLogs === 1 ? 'entry' : 'entries'}
            </Text>
          </View>
          <View style={styles.pageHeaderBadge}>
            <Icon name="chart-areaspline" size={22} color="#7c6ff7" />
          </View>
        </View>
      </Animated.View>

      {/* Stat cards */}
      <View style={styles.statsGrid}>
        <StatCard
          title="Entries"
          value={totalLogs}
          icon="calendar-check"
          color="#6c5ce7"
          delay={0}
          style={{width: statCardWidth}}
        />
        {/* FIX: Correct top mood display — show it as a text card, not AnimatedNumber */}
        <View style={[styles.statCard, {width: statCardWidth}]}>
          <Animated.View style={[{opacity: 1}]}>
            <View
              style={[
                styles.statIconWrap,
                {backgroundColor: '#fd79a8' + '1A'},
              ]}>
              <Icon name="emoticon-happy-outline" size={22} color="#fd79a8" />
            </View>
            <Text style={styles.statTitle}>Top Mood</Text>
            <Text
              style={[styles.statValueText, {color: '#fd79a8'}]}
              numberOfLines={1}>
              {getMoodEmoji(topMood)}{' '}
              {topMood.charAt(0).toUpperCase() + topMood.slice(1)}
            </Text>
          </Animated.View>
        </View>
      </View>

      {/* Top mood banner */}
      <View
        style={[
          styles.topMoodBanner,
          {borderColor: getMoodColor(topMood) + '40'},
        ]}>
        <Text style={styles.topMoodEmoji}>{getMoodEmoji(topMood)}</Text>
        <View style={{flex: 1}}>
          <Text style={styles.topMoodLabel}>Dominant Vibe</Text>
          <Text style={[styles.topMoodName, {color: getMoodColor(topMood)}]}>
            {topMood.charAt(0).toUpperCase() + topMood.slice(1)}
          </Text>
        </View>
        <View
          style={[
            styles.topMoodPill,
            {backgroundColor: getMoodColor(topMood) + '20'},
          ]}>
          <Text
            style={[styles.topMoodPillText, {color: getMoodColor(topMood)}]}>
            {distribution[0]?.count ?? 0}×
          </Text>
        </View>
      </View>

      {/* Vibe Radar Chart */}
      {Object.keys(vibe_scores).length > 0 && (
        <SectionCard title="Vibe Breakdown" icon="radar" iconColor="#6c5ce7">
          <VibeRadarChart
            vibeScores={vibe_scores}
            color="#6c5ce7"
            size={Math.min(chartWidth, 320)}
          />
        </SectionCard>
      )}

      {/* Weekly Goal Section */}
      <SectionCard
        title="Weekly Focus"
        icon="target"
        iconColor="#e17055"
        accentColor="#e17055">
        {selectedGoalVibes.length > 0 ? (
          <View style={styles.goalActiveContainer}>
            <View style={styles.goalInfoRow}>
              <Text style={styles.goalText}>
                Target Vibes
              </Text>
              <TouchableOpacity onPress={() => setShowGoalPicker(true)}>
                <Text style={styles.goalChangeBtn}>Change</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.goalChipRow}>
              {selectedGoalVibes.map(vibe => (
                <View
                  key={vibe}
                  style={[
                    styles.goalMiniChip,
                    {backgroundColor: getMoodColor(vibe) + '22'},
                  ]}>
                  <Text
                    style={[
                      styles.goalMiniChipText,
                      {color: getMoodColor(vibe)},
                    ]}>
                    {getMoodEmoji(vibe)} {vibe}
                  </Text>
                </View>
              ))}
            </View>

            <AnimatedProgressBar
              progress={goalProgress}
              color={goalAccent}
            />

            <Text style={styles.goalSubtext}>
              Best goal: {getMoodEmoji(goalVibe)} {goalVibe} · {goalCount}/
              {weeklyTotalLogs} weekly entries ·{' '}
              {Math.round(goalProgress * 100)}% reached · {goalDaysLabel}
            </Text>

            {/* ── NEW: Check Goal Reaction Button ── */}
            <TouchableOpacity
              style={[
                goalReactionStyles.checkBtn,
                {
                  backgroundColor:
                    goalReached
                      ? goalAccent + '22'
                      : goalFailed
                      ? '#fff1f0'
                      : '#fff8f3',
                  borderColor:
                    goalReached
                      ? goalAccent
                      : goalFailed
                      ? '#d63031'
                      : '#e17055',
                },
              ]}
              onPress={() => setShowGoalModal(true)}
              activeOpacity={0.75}>
              <Text style={goalReactionStyles.checkBtnEmoji}>
                {goalReached ? '🏆' : goalFailed ? '⚠️' : '💪'}
              </Text>
              <View style={{flex: 1}}>
                <Text
                  style={[
                    goalReactionStyles.checkBtnTitle,
                    {
                      color:
                        goalReached
                          ? goalAccent
                          : goalFailed
                          ? '#d63031'
                          : '#e17055',
                    },
                  ]}>
                  {goalReached
                    ? `${goalVibe} won this week! See Your Insight`
                    : goalFailed
                    ? 'Fresh Start - Review This Week'
                    : 'How am I doing with these goals?'}
                </Text>
                <Text style={goalReactionStyles.checkBtnSub}>
                  {goalReached
                    ? 'Any one selected vibe can win the weekly focus'
                    : goalFailed
                    ? 'The 7-day focus wrapped. Grab a useful clue for next time'
                    : `${Math.round(
                        goalProgress * 100,
                      )}% reached — ${goalDaysLabel.toLowerCase()}`}
                </Text>
              </View>
              <Icon name="chevron-right" size={20} color="#ccc" />
            </TouchableOpacity>

            {/* Saved insights list (if any) */}
            {savedInsights.length > 0 && (
              <View style={goalReactionStyles.savedList}>
                <Text style={goalReactionStyles.savedTitle}>
                  Saved Insights
                </Text>
                {savedInsights.map((ins, i) => (
                  <View key={i} style={goalReactionStyles.savedItem}>
                    <Icon
                      name="bookmark"
                      size={13}
                      color="#6c5ce7"
                      style={{marginTop: 2}}
                    />
                    <Text style={goalReactionStyles.savedText}>{ins}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          <TouchableOpacity
            style={styles.setGoalBtn}
            onPress={() => setShowGoalPicker(true)}>
            <Icon name="plus-circle-outline" size={20} color="#e17055" />
            <Text style={styles.setGoalBtnText}>
              Set a target vibe for the week
            </Text>
          </TouchableOpacity>
        )}
      </SectionCard>

      {/* ── NEW: Goal Completion Modal ── */}
      <GoalCompletionModal
        visible={showGoalModal}
        onClose={() => setShowGoalModal(false)}
        goalVibe={goalVibe}
        goalProgress={goalProgress}
        goalCount={goalCount}
        totalLogs={weeklyTotalLogs}
        moodHistory={moodHistory} // pass moodHistory prop from parent if available
        goalFailed={goalFailed}
        weeklyMoodCounts={weeklyMoodCounts}
        weeklyBreakdown={weeklyBreakdown}
        onSaveInsight={text => {
          setSavedInsights(prev => [text, ...prev]);
          setShowGoalModal(false);
        }}
      />

      {/* Goal Picker Modal */}
      <Modal
        visible={showGoalPicker}
        transparent
        animationType="fade"
        onRequestClose={handleCancelGoalPicker}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleCancelGoalPicker}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Choose your Focus</Text>
              <Text style={styles.modalSub}>
                Pick 1 to 3 feel-good vibes to keep as this week's focus.
              </Text>
              <View
                style={[
                  styles.goalQuoteCard,
                  {borderColor: getMoodColor(previewGoalVibe) + '55'},
                ]}>
                <Text style={styles.goalQuoteEmoji}>
                  {getMoodEmoji(previewGoalVibe)}
                </Text>
                <View style={{flex: 1}}>
                  <Text
                    style={[
                      styles.goalQuoteVibe,
                      {color: getMoodColor(previewGoalVibe)},
                    ]}>
                    {previewGoalVibe}
                  </Text>
                  <Text style={styles.goalQuoteText}>
                    "{GOAL_VIBE_QUOTES[previewGoalVibe]}"
                  </Text>
                </View>
              </View>
              <ScrollView
                contentContainerStyle={styles.vibeGrid}
                style={{maxHeight: 300}}>
                {POSITIVE_GOAL_VIBES.map(vibe => (
                  <TouchableOpacity
                    key={vibe}
                    style={[
                      styles.vibeChip,
                      {borderColor: getMoodColor(vibe)},
                      previewGoalVibe === vibe && {
                        borderWidth: 2,
                        transform: [{scale: 1.02}],
                      },
                      draftGoalVibes.includes(vibe) && {
                        backgroundColor: getMoodColor(vibe) + '25',
                      },
                    ]}
                    onPress={() => handleSetGoal(vibe)}>
                    <Text style={styles.vibeChipEmoji}>
                      {getMoodEmoji(vibe)}
                    </Text>
                    <Text style={styles.vibeChipText}>{vibe}</Text>
                    {draftGoalVibes.includes(vibe) && (
                      <Icon name="check-circle" size={14} color={getMoodColor(vibe)} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={styles.goalPickerHint}>
                {draftGoalVibes.length}/3 selected - each one stays active for
                the full week.
              </Text>
              <View style={styles.goalPickerActions}>
                <TouchableOpacity
                  style={styles.closeModalBtn}
                  onPress={handleCancelGoalPicker}>
                  <Text style={styles.closeModalBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.doneModalBtn,
                    {
                      backgroundColor: isDraftGoalValid
                        ? getMoodColor(previewGoalVibe)
                        : '#dfe3e8',
                    },
                  ]}
                  onPress={handleSaveGoalPicker}
                  disabled={!isDraftGoalValid}
                  activeOpacity={0.8}>
                  <Icon
                    name="check"
                    size={16}
                    color={isDraftGoalValid ? '#fff' : '#8a94a3'}
                  />
                  <Text
                    style={[
                      styles.doneModalBtnText,
                      !isDraftGoalValid && styles.doneModalBtnTextDisabled,
                    ]}>
                    Done
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

{/* ── Fandom Character Match ── */}
      {distribution.length > 0 && (
        <FandomCharacterMatch topMood={topMood} distribution={distribution} totalLogs={totalLogs} />
      )}

      {/* ── Story Arc Section ── */}
      {distribution.length > 0 && (
        <MoodStoryArc distribution={distribution} totalLogs={totalLogs} weeklyBreakdown={weeklyBreakdown} />
      )}

       {/* Refresh */}
       {onRefresh && (
        <TouchableOpacity style={styles.fullRefreshButton} onPress={onRefresh}>
          <Icon name="refresh" size={15} color="#aaa" />
          <Text style={styles.fullRefreshText}>Sync Latest Data</Text>
        </TouchableOpacity>
      )}
      </View>
    </ScrollView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {flex: 1, paddingHorizontal: ANALYTICS_HORIZONTAL_PADDING},
  contentSizer: {width: '100%'},
  centerContainer: {
    minHeight: 380,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {fontSize: 15, fontWeight: '600', marginTop: 8},
  emptyText: {fontSize: 18, fontWeight: '800'},
  emptySubText: {fontSize: 13},
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#6c5ce7',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    marginTop: 8,
  },
  refreshButtonText: {color: '#fff', fontWeight: '700'},
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 20,
  },
  pageHeaderBadge: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#7c6ff715',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#7c6ff725',
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    elevation: 3,
    shadowColor: '#6c5ce7',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.07,
    shadowRadius: 10,
    gap: 6,
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statTitle: {
    fontSize: 11,
    color: '#aaa',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {fontSize: 26, fontWeight: '900', letterSpacing: -1},
  // FIX: text variant for non-numeric stats like top mood
  statValueText: {fontSize: 15, fontWeight: '800', letterSpacing: -0.3},

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
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.09,
    shadowRadius: 10,
  },
  topMoodEmoji: {fontSize: 38},
  topMoodLabel: {
    fontSize: 11,
    color: '#aaa',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  topMoodName: {fontSize: 22, fontWeight: '900', letterSpacing: -0.5},
  topMoodPill: {paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12},
  topMoodPillText: {fontSize: 12, fontWeight: '800'},

  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
    elevation: 3,
    shadowColor: '#6c5ce7',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.06,
    shadowRadius: 12,
    overflow: 'hidden',
  },
  sectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },
  sectionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionCardTitle: {fontSize: 16, fontWeight: '800', color: '#2d3436'},

  donutContainer: {alignItems: 'center'},
  legendContainer: {width: '100%', gap: 6, marginTop: 10},
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  legendItemActive: {backgroundColor: '#F7F6FF'},
  legendDot: {width: 10, height: 10, borderRadius: 5},
  legendLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#2d3436',
    textTransform: 'capitalize',
  },
  legendCount: {fontSize: 13, fontWeight: '800'},

  chartEmpty: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  chartEmptyText: {color: '#ccc', fontSize: 13},

  barRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  barLabel: {
    width: 72,
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
    textTransform: 'capitalize',
    textAlign: 'right',
  },
  barTrack: {
    flex: 1,
    height: 22,
    backgroundColor: '#F3F2FF',
    borderRadius: 6,
    overflow: 'hidden',
  },
  barFill: {height: '100%'},
  barPct: {width: 36, fontSize: 11, fontWeight: '800', textAlign: 'right'},

  insightText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#2d3436',
    fontStyle: 'italic',
  },

  fullRefreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 6,
  },
  fullRefreshText: {fontSize: 13, color: '#bbb', fontWeight: '600'},

  goalActiveContainer: {paddingVertical: 4},
  goalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalText: {fontSize: 15, color: '#2d3436', flex: 1},
  goalChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  goalMiniChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  goalMiniChipText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  goalChangeBtn: {
    fontSize: 13,
    color: '#6c5ce7',
    fontWeight: '700',
    marginLeft: 8,
  },
  goalProgressTrack: {
    height: 10,
    backgroundColor: '#f0eff8',
    borderRadius: 5,
    overflow: 'hidden',
  },
  goalProgressBar: {height: '100%', borderRadius: 5},
  goalSubtext: {fontSize: 12, color: '#aaa', marginTop: 8, fontWeight: '600'},
  setGoalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 12,
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: '#e17055',
    borderRadius: 16,
  },
  setGoalBtnText: {color: '#e17055', fontWeight: '700', fontSize: 14},

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2d3436',
    textAlign: 'center',
  },
  modalSub: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  goalQuoteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#fffdf8',
    marginBottom: 16,
  },
  goalQuoteEmoji: {fontSize: 28},
  goalQuoteVibe: {
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'capitalize',
    marginBottom: 2,
  },
  goalQuoteText: {
    fontSize: 12,
    lineHeight: 17,
    color: '#666',
    fontWeight: '600',
  },
  vibeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  vibeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    backgroundColor: '#fff',
  },
  vibeChipEmoji: {fontSize: 16},
  vibeChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#444',
    textTransform: 'capitalize',
  },
  goalPickerHint: {
    marginTop: 14,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 17,
    color: '#7a7f87',
    fontWeight: '700',
  },
  goalPickerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 24,
  },
  closeModalBtn: {
    minWidth: 112,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  closeModalBtnText: {color: '#999', fontWeight: '700', fontSize: 15},
  doneModalBtn: {
    minWidth: 112,
    minHeight: 44,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 18,
  },
  doneModalBtnText: {color: '#fff', fontWeight: '800', fontSize: 15},
  doneModalBtnTextDisabled: {color: '#8a94a3'},
});
const goalReactionStyles = StyleSheet.create({
  checkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  checkBtnEmoji: {fontSize: 26},
  checkBtnTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  checkBtnSub: {
    fontSize: 11,
    color: '#aaa',
    fontWeight: '600',
    marginTop: 2,
  },
  savedList: {
    marginTop: 16,
    gap: 10,
  },
  savedTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#aaa',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  savedItem: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#f5f3ff',
    padding: 12,
    borderRadius: 12,
  },
  savedText: {
    flex: 1,
    fontSize: 13,
    color: '#444',
    lineHeight: 20,
    fontStyle: 'italic',
  },
});
export default AnalyticsDisplay;
