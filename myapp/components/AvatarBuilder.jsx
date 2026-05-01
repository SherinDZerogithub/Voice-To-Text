import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import {SvgXml} from 'react-native-svg';

// Avatar config options

const AVATAR_OPTIONS = {
  gender: ['girl', 'boy'],

  skinTone: ['#FDDBB4', '#F1A97A', '#C68642', '#8D5524', '#4A2912'],

  hairStyle: {
    girl: ['long_straight', 'long_wavy', 'bun', 'ponytail', 'short_bob'],
    boy: ['short_side', 'short_curly', 'buzz', 'messy', 'slick'],
  },

  hairColor: [
    '#1a0a00',
    '#4B3621',
    '#8B5E3C',
    '#D4A04A',
    '#F5C5A3',
    '#C0392B',
    '#8E44AD',
    '#2980B9',
  ],

  eyeStyle: ['normal', 'happy', 'wink', 'sleepy', 'surprised'],

  eyeColor: ['#2c3e50', '#1a6b3c', '#6B4226', '#1e90ff', '#808080'],

  mouthStyle: ['smile', 'big_smile', 'neutral', 'smirk', 'open'],

  glasses: ['none', 'round', 'square', 'cat_eye', 'sunglasses'],

  accessories: ['none', 'earrings', 'necklace', 'bow', 'headband', 'cap'],

  bgColor: [
    '#f5e6ff',
    '#e6f5ff',
    '#fff5e6',
    '#e6ffe6',
    '#ffe6e6',
    '#e6e6ff',
    '#fff0e6',
    '#f0f0f0',
  ],
};

// â”€â”€â”€ SVG Part Generators â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const getHairPath = (style, gender) => {
  const hairPaths = {
    // Girl styles
    long_straight: `
      <path d="M50,80 Q20,90 18,160 Q16,200 20,240 L25,240 Q22,200 25,160 Q26,110 50,95 Z" fill="HAIR"/>
      <path d="M150,80 Q180,90 182,160 Q184,200 180,240 L175,240 Q178,200 175,160 Q174,110 150,95 Z" fill="HAIR"/>
      <path d="M40,70 Q50,20 100,18 Q150,20 160,70 Q165,50 160,40 Q140,0 100,0 Q60,0 40,40 Q35,50 40,70 Z" fill="HAIR"/>
    `,
    long_wavy: `
      <path d="M50,80 Q15,100 20,140 Q10,160 22,180 Q8,200 20,220 Q10,240 22,250 L27,250 Q16,238 27,220 Q14,198 28,178 Q14,155 27,138 Q20,100 52,88 Z" fill="HAIR"/>
      <path d="M150,80 Q185,100 180,140 Q190,160 178,180 Q192,200 180,220 Q190,240 178,250 L173,250 Q184,238 173,220 Q186,198 172,178 Q186,155 173,138 Q180,100 148,88 Z" fill="HAIR"/>
      <path d="M40,70 Q50,20 100,18 Q150,20 160,70 Q165,50 160,40 Q140,0 100,0 Q60,0 40,40 Q35,50 40,70 Z" fill="HAIR"/>
    `,
    bun: `
      <path d="M40,70 Q50,20 100,18 Q150,20 160,70 Q165,50 160,40 Q140,0 100,0 Q60,0 40,40 Q35,50 40,70 Z" fill="HAIR"/>
      <circle cx="100" cy="10" r="22" fill="HAIR"/>
      <circle cx="100" cy="10" r="12" fill="HAIR_LIGHT"/>
    `,
    ponytail: `
      <path d="M40,70 Q50,20 100,18 Q150,20 160,70 Q165,50 160,40 Q140,0 100,0 Q60,0 40,40 Q35,50 40,70 Z" fill="HAIR"/>
      <path d="M155,55 Q180,50 185,80 Q188,110 175,140 Q170,155 165,140 Q170,115 167,90 Q165,68 155,65 Z" fill="HAIR"/>
    `,
    short_bob: `
      <path d="M35,75 Q40,20 100,18 Q160,20 165,75 Q170,100 160,110 Q140,118 100,118 Q60,118 40,110 Q30,100 35,75 Z" fill="HAIR"/>
    `,
    // Boy styles
    short_side: `
      <path d="M38,72 Q42,22 100,20 Q158,22 162,72 Q158,55 150,48 Q130,38 100,37 Q72,38 52,47 Q42,54 38,72 Z" fill="HAIR"/>
      <path d="M38,72 Q36,60 40,52 Q38,68 42,75 Z" fill="HAIR"/>
    `,
    short_curly: `
      <path d="M38,72 Q42,22 100,20 Q158,22 162,72 Q158,55 150,48 Q130,38 100,37 Q72,38 52,47 Q42,54 38,72 Z" fill="HAIR"/>
      <circle cx="52" cy="48" r="8" fill="HAIR"/>
      <circle cx="70" cy="38" r="9" fill="HAIR"/>
      <circle cx="90" cy="34" r="9" fill="HAIR"/>
      <circle cx="110" cy="34" r="9" fill="HAIR"/>
      <circle cx="130" cy="38" r="9" fill="HAIR"/>
      <circle cx="148" cy="48" r="8" fill="HAIR"/>
    `,
    buzz: `
      <path d="M40,75 Q44,26 100,24 Q156,26 160,75 Q160,55 152,44 Q130,32 100,31 Q70,32 48,44 Q40,55 40,75 Z" fill="HAIR"/>
    `,
    messy: `
      <path d="M38,72 Q42,22 100,20 Q158,22 162,72 Q158,55 150,48 Q130,38 100,37 Q72,38 52,47 Q42,54 38,72 Z" fill="HAIR"/>
      <path d="M55,44 Q50,28 60,22 Q58,34 65,38 Z" fill="HAIR"/>
      <path d="M80,35 Q82,18 92,16 Q88,28 94,34 Z" fill="HAIR"/>
      <path d="M108,35 Q112,18 120,22 Q114,30 116,36 Z" fill="HAIR"/>
      <path d="M138,44 Q148,30 152,24 Q148,36 142,40 Z" fill="HAIR"/>
    `,
    slick: `
      <path d="M38,72 Q42,22 100,20 Q158,22 162,72 Q158,55 150,48 Q130,38 100,37 Q72,38 52,47 Q42,54 38,72 Z" fill="HAIR"/>
      <path d="M40,60 Q50,30 80,26 Q60,30 55,50 Z" fill="HAIR_DARK"/>
    `,
  };
  return hairPaths[style] || hairPaths.short_side;
};

const getEyesSVG = (style, color) => {
  const eyes = {
    normal: `
      <ellipse cx="76" cy="108" rx="10" ry="11" fill="white"/>
      <circle cx="76" cy="110" r="7" fill="${color}"/>
      <circle cx="76" cy="110" r="3.5" fill="#111"/>
      <circle cx="79" cy="107" r="1.5" fill="white"/>
      <ellipse cx="124" cy="108" rx="10" ry="11" fill="white"/>
      <circle cx="124" cy="110" r="7" fill="${color}"/>
      <circle cx="124" cy="110" r="3.5" fill="#111"/>
      <circle cx="127" cy="107" r="1.5" fill="white"/>
    `,
    happy: `
      <path d="M66,108 Q76,100 86,108" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M114,108 Q124,100 134,108" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    `,
    wink: `
      <ellipse cx="76" cy="108" rx="10" ry="11" fill="white"/>
      <circle cx="76" cy="110" r="7" fill="${color}"/>
      <circle cx="76" cy="110" r="3.5" fill="#111"/>
      <circle cx="79" cy="107" r="1.5" fill="white"/>
      <path d="M114,108 Q124,100 134,108" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    `,
    sleepy: `
      <path d="M66,106 Q76,112 86,106" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M114,106 Q124,112 134,106" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    `,
    surprised: `
      <ellipse cx="76" cy="108" rx="12" ry="13" fill="white"/>
      <circle cx="76" cy="110" r="8" fill="${color}"/>
      <circle cx="76" cy="110" r="4" fill="#111"/>
      <circle cx="79" cy="107" r="2" fill="white"/>
      <ellipse cx="124" cy="108" rx="12" ry="13" fill="white"/>
      <circle cx="124" cy="110" r="8" fill="${color}"/>
      <circle cx="124" cy="110" r="4" fill="#111"/>
      <circle cx="127" cy="107" r="2" fill="white"/>
    `,
  };
  return eyes[style] || eyes.normal;
};

const getMouthSVG = style => {
  const mouths = {
    smile:
      '<path d="M82,138 Q100,152 118,138" stroke="#c0605a" stroke-width="2.5" fill="none" stroke-linecap="round"/>',
    big_smile: `<path d="M78,136 Q100,158 122,136" stroke="#c0605a" stroke-width="2.5" fill="#e8a09d" stroke-linecap="round"/>
                <path d="M83,136 Q100,148 117,136" fill="#c0605a"/>`,
    neutral:
      '<line x1="86" y1="142" x2="114" y2="142" stroke="#c0605a" stroke-width="2.5" stroke-linecap="round"/>',
    smirk:
      '<path d="M86,142 Q104,138 114,134" stroke="#c0605a" stroke-width="2.5" fill="none" stroke-linecap="round"/>',
    open: `<ellipse cx="100" cy="142" rx="14" ry="9" fill="#c0605a"/>
                <ellipse cx="100" cy="144" rx="10" ry="6" fill="#8b3a3a"/>`,
  };
  return mouths[style] || mouths.smile;
};

const getGlassesSVG = style => {
  const glasses = {
    none: '',
    round: `
      <circle cx="76" cy="108" r="15" fill="none" stroke="#555" stroke-width="2.5"/>
      <circle cx="124" cy="108" r="15" fill="none" stroke="#555" stroke-width="2.5"/>
      <line x1="91" y1="108" x2="109" y2="108" stroke="#555" stroke-width="2"/>
      <line x1="42" y1="104" x2="61" y2="104" stroke="#555" stroke-width="2"/>
      <line x1="139" y1="104" x2="158" y2="104" stroke="#555" stroke-width="2"/>
    `,
    square: `
      <rect x="60" y="94" width="32" height="24" rx="3" fill="none" stroke="#555" stroke-width="2.5"/>
      <rect x="108" y="94" width="32" height="24" rx="3" fill="none" stroke="#555" stroke-width="2.5"/>
      <line x1="92" y1="106" x2="108" y2="106" stroke="#555" stroke-width="2"/>
      <line x1="42" y1="102" x2="60" y2="102" stroke="#555" stroke-width="2"/>
      <line x1="140" y1="102" x2="158" y2="102" stroke="#555" stroke-width="2"/>
    `,
    cat_eye: `
      <path d="M58,112 Q68,94 92,96 Q96,118 76,118 Z" fill="none" stroke="#c0392b" stroke-width="2.5"/>
      <path d="M106,112 Q116,94 140,96 Q146,118 124,118 Z" fill="none" stroke="#c0392b" stroke-width="2.5"/>
      <line x1="92" y1="107" x2="106" y2="107" stroke="#c0392b" stroke-width="2"/>
      <line x1="42" y1="103" x2="58" y2="107" stroke="#c0392b" stroke-width="2"/>
      <line x1="140" y1="107" x2="158" y2="103" stroke="#c0392b" stroke-width="2"/>
    `,
    sunglasses: `
      <rect x="58" y="98" width="38" height="20" rx="10" fill="rgba(30,30,30,0.85)"/>
      <rect x="104" y="98" width="38" height="20" rx="10" fill="rgba(30,30,30,0.85)"/>
      <line x1="96" y1="108" x2="104" y2="108" stroke="#555" stroke-width="2"/>
      <line x1="42" y1="104" x2="58" y2="106" stroke="#555" stroke-width="2"/>
      <line x1="142" y1="106" x2="158" y2="104" stroke="#555" stroke-width="2"/>
    `,
  };
  return glasses[style] || '';
};

const getAccessorySVG = (style, gender) => {
  const accessories = {
    none: '',
    earrings: `
      <circle cx="38" cy="122" r="4" fill="#FFD700"/>
      <circle cx="162" cy="122" r="4" fill="#FFD700"/>
      <circle cx="38" cy="132" r="3" fill="#FFD700"/>
      <circle cx="162" cy="132" r="3" fill="#FFD700"/>
    `,
    necklace: `
      <path d="M65,180 Q100,195 135,180" stroke="#FFD700" stroke-width="2.5" fill="none"/>
      <circle cx="100" cy="196" r="5" fill="#FFD700"/>
    `,
    bow: `
      <path d="M82,62 Q90,54 100,60 Q110,54 118,62 Q110,68 100,64 Q90,68 82,62 Z" fill="#FF6B9D"/>
      <circle cx="100" cy="62" r="5" fill="#FF3D7F"/>
    `,
    headband: `
      <path d="M40,78 Q100,60 160,78" stroke="#9B59B6" stroke-width="8" fill="none" stroke-linecap="round"/>
    `,
    cap: `
      <path d="M35,78 Q100,40 165,78 Q160,72 152,68 Q130,55 100,52 Q70,55 48,68 Q40,72 35,78 Z" fill="#3498DB"/>
      <rect x="25" y="74" width="34" height="8" rx="4" fill="#2980B9"/>
    `,
  };
  return accessories[style] || '';
};

// â”€â”€â”€ Main SVG Builder â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const buildAvatarSVG = config => {
  const {
    gender,
    skinTone,
    hairStyle,
    hairColor,
    eyeStyle,
    eyeColor,
    mouthStyle,
    glasses,
    accessories,
    bgColor,
  } = config;

  const hairDark = darkenHex(hairColor, 30);

  const hairSVG = getHairPath(hairStyle, gender)
    .replace(/fill="HAIR_LIGHT"/g, `fill="${lightenHex(hairColor, 40)}"`)
    .replace(/fill="HAIR_DARK"/g, `fill="${hairDark}"`)
    .replace(/fill="HAIR"/g, `fill="${hairColor}"`);

  return `
<svg viewBox="0 0 200 280" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <circle cx="100" cy="140" r="100" fill="${bgColor}"/>

  <!-- Neck -->
  <rect x="88" y="168" width="24" height="30" rx="8" fill="${skinTone}"/>

  <!-- Shoulders / Body -->
  ${
    gender === 'girl'
      ? '<path d="M30,250 Q50,195 100,188 Q150,195 170,250 Q145,260 100,262 Q55,260 30,250 Z" fill="#E91E8C"/>'
      : '<path d="M28,250 Q48,192 100,186 Q152,192 172,250 Q148,262 100,264 Q52,262 28,250 Z" fill="#3498DB"/>'
  }

  <!-- Head -->
  <ellipse cx="100" cy="115" rx="65" ry="70" fill="${skinTone}"/>

  <!-- Hair (behind ears layer) -->
  ${hairSVG}

  <!-- Ears -->
  <ellipse cx="36" cy="118" rx="9" ry="11" fill="${skinTone}"/>
  <ellipse cx="164" cy="118" rx="9" ry="11" fill="${skinTone}"/>
  <ellipse cx="36" cy="118" rx="5" ry="7" fill="${darkenHex(skinTone, 15)}"/>
  <ellipse cx="164" cy="118" rx="5" ry="7" fill="${darkenHex(skinTone, 15)}"/>

  <!-- Eyebrows -->
  <path d="M63,95 Q76,88 89,93" stroke="${hairColor}" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M111,93 Q124,88 137,95" stroke="${hairColor}" stroke-width="3" fill="none" stroke-linecap="round"/>

  <!-- Eyes -->
  ${getEyesSVG(eyeStyle, eyeColor)}

  <!-- Nose -->
  <path d="M97,118 Q95,130 100,134 Q105,130 103,118" stroke="${darkenHex(
    skinTone,
    25,
  )}" stroke-width="1.5" fill="none" stroke-linecap="round"/>

  <!-- Cheek blush -->
  <ellipse cx="62" cy="128" rx="11" ry="7" fill="rgba(255,150,150,0.3)"/>
  <ellipse cx="138" cy="128" rx="11" ry="7" fill="rgba(255,150,150,0.3)"/>

  <!-- Mouth -->
  ${getMouthSVG(mouthStyle)}

  <!-- Glasses -->
  ${getGlassesSVG(glasses)}

  <!-- Accessories -->
  ${getAccessorySVG(accessories, gender)}
</svg>
  `.trim();
};

// â”€â”€â”€ Color Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function rgbToHex(r, g, b) {
  return (
    '#' +
    [r, g, b]
      .map(v => Math.min(255, Math.max(0, v)).toString(16).padStart(2, '0'))
      .join('')
  );
}

function lightenHex(hex, amount = 30) {
  const {r, g, b} = hexToRgb(hex);
  return rgbToHex(r + amount, g + amount, b + amount);
}

function darkenHex(hex, amount = 30) {
  const {r, g, b} = hexToRgb(hex);
  return rgbToHex(r - amount, g - amount, b - amount);
}

// â”€â”€â”€ Option Renderer Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ColorSwatch = ({color, selected, onPress}) => (
  <TouchableOpacity
    style={[
      styles.swatch,
      {backgroundColor: color},
      selected && styles.swatchSelected,
    ]}
    onPress={() => onPress(color)}
    activeOpacity={0.8}
  />
);

const formatOptionLabel = value =>
  value.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());

const OptionChip = ({label, selected, onPress}) => (
  <TouchableOpacity
    style={[styles.chip, selected && styles.chipSelected]}
    onPress={onPress}
    activeOpacity={0.8}>
    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
      {formatOptionLabel(label)}
    </Text>
  </TouchableOpacity>
);

// â”€â”€â”€ AvatarBuilder Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const DEFAULT_CONFIG = {
  gender: 'girl',
  skinTone: '#FDDBB4',
  hairStyle: 'long_straight',
  hairColor: '#4B3621',
  eyeStyle: 'normal',
  eyeColor: '#2c3e50',
  mouthStyle: 'smile',
  glasses: 'none',
  accessories: 'none',
  bgColor: '#f5e6ff',
};

const SECTIONS = [
  {key: 'gender', label: 'Gender', type: 'chip'},
  {key: 'skinTone', label: 'Skin Tone', type: 'color'},
  {key: 'hairStyle', label: 'Hair Style', type: 'chip_dynamic'},
  {key: 'hairColor', label: 'Hair Color', type: 'color'},
  {key: 'eyeStyle', label: 'Eyes', type: 'chip'},
  {key: 'eyeColor', label: 'Eye Color', type: 'color'},
  {key: 'mouthStyle', label: 'Mouth', type: 'chip'},
  {key: 'glasses', label: 'Glasses', type: 'chip'},
  {key: 'accessories', label: 'Accessories', type: 'chip'},
  {key: 'bgColor', label: 'Background', type: 'color'},
];

const AvatarBuilder = ({visible, onClose, onSave}) => {
  const [config, setConfig] = useState({...DEFAULT_CONFIG});

  const update = useCallback((key, value) => {
    setConfig(prev => {
      const next = {...prev, [key]: value};
      // Reset hair style when gender changes
      if (key === 'gender') {
        next.hairStyle = AVATAR_OPTIONS.hairStyle[value][0];
        next.accessories = 'none';
      }
      return next;
    });
  }, []);

  const avatarSVG = buildAvatarSVG(config);

  const renderSection = section => {
    const {key, label, type} = section;

    if (type === 'color') {
      const colors = AVATAR_OPTIONS[key];
      return (
        <View key={key} style={styles.section}>
          <Text style={styles.sectionLabel}>{label}</Text>
          <View style={styles.swatchRow}>
            {colors.map(color => (
              <ColorSwatch
                key={color}
                color={color}
                selected={config[key] === color}
                onPress={v => update(key, v)}
              />
            ))}
          </View>
        </View>
      );
    }

    if (type === 'chip' || type === 'chip_dynamic') {
      const options =
        type === 'chip_dynamic'
          ? AVATAR_OPTIONS[key][config.gender]
          : AVATAR_OPTIONS[key];

      return (
        <View key={key} style={styles.section}>
          <Text style={styles.sectionLabel}>{label}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {options.map(opt => (
                <OptionChip
                  key={opt}
                  label={opt}
                  selected={config[key] === opt}
                  onPress={() => update(key, opt)}
                />
              ))}
            </View>
          </ScrollView>
        </View>
      );
    }
    return null;
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.headerBtn}
            activeOpacity={0.8}>
            <Text style={styles.headerBtnText}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Build Avatar</Text>
          <TouchableOpacity
            onPress={() => onSave && onSave(config, avatarSVG)}
            style={[styles.headerBtn, styles.saveBtn]}
            activeOpacity={0.8}>
            <Text style={[styles.headerBtnText, styles.saveBtnText]}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Avatar Preview */}
          <View
            style={[
              styles.previewContainer,
              {backgroundColor: config.bgColor},
            ]}>
            <SvgXml xml={avatarSVG} width={200} height={200} />
          </View>

          {/* Randomize Button */}
          <TouchableOpacity
            style={styles.randomBtn}
            onPress={() => {
              const g = Math.random() > 0.5 ? 'girl' : 'boy';
              const pick = arr => arr[Math.floor(Math.random() * arr.length)];
              setConfig({
                gender: g,
                skinTone: pick(AVATAR_OPTIONS.skinTone),
                hairStyle: pick(AVATAR_OPTIONS.hairStyle[g]),
                hairColor: pick(AVATAR_OPTIONS.hairColor),
                eyeStyle: pick(AVATAR_OPTIONS.eyeStyle),
                eyeColor: pick(AVATAR_OPTIONS.eyeColor),
                mouthStyle: pick(AVATAR_OPTIONS.mouthStyle),
                glasses: pick(AVATAR_OPTIONS.glasses),
                accessories: pick(AVATAR_OPTIONS.accessories),
                bgColor: pick(AVATAR_OPTIONS.bgColor),
              });
            }}
            activeOpacity={0.8}>
            <Text style={styles.randomBtnText}>Randomize</Text>
          </TouchableOpacity>

          {/* Option Sections */}
          {SECTIONS.map(renderSection)}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

// â”€â”€â”€ AvatarDisplay (small widget shown in app) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const AvatarDisplay = ({config, size = 60, onPress}) => {
  const svg = config ? buildAvatarSVG(config) : buildAvatarSVG(DEFAULT_CONFIG);
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.avatarDisplay,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: config?.bgColor || '#f5e6ff',
        },
      ]}
      activeOpacity={0.85}>
      <SvgXml xml={svg} width={size * 0.9} height={size * 0.9} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop:
      Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    textAlign: 'center',
  },
  headerBtn: {
    minWidth: 76,
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  saveBtn: {
    backgroundColor: '#6c5ce7',
  },
  headerBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
  },
  saveBtnText: {
    color: '#fff',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 48,
  },
  previewContainer: {
    alignSelf: 'center',
    width: 210,
    height: 210,
    borderRadius: 105,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  randomBtn: {
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#6c5ce7',
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 32,
    marginBottom: 28,
  },
  randomBtnText: {
    color: '#6c5ce7',
    fontWeight: '700',
    fontSize: 15,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#444',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchSelected: {
    borderColor: '#6c5ce7',
    transform: [{scale: 1.15}],
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#ddd',
  },
  chipSelected: {
    backgroundColor: '#6c5ce7',
    borderColor: '#6c5ce7',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  chipTextSelected: {
    color: '#fff',
  },
  avatarDisplay: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#6c5ce7',
  },
});

export default AvatarBuilder;
